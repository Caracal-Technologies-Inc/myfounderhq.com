#!/usr/bin/env python3
"""
Capture Android screenshots over ADB on the user's local computer and upload to
MyFounderHQ's private Supabase screenshot library.

No Supabase service-role key, password file or persistent access token required.
Requires Python 3.9+, Android platform-tools (adb) and a MyFounderHQ login.
Run only with authorization to capture the displayed app.
"""
import argparse
import getpass
import json
import os
import re
import subprocess
import sys
import time
import uuid
from urllib import request, parse, error

PNG_HEADER = b"\x89PNG\r\n\x1a\n"
BUCKET = "hq-reference-screenshots"


def api(url, method="GET", body=None, headers=None):
    data = None if body is None else (json.dumps(body).encode("utf-8") if not isinstance(body, bytes) else body)
    req = request.Request(url, data=data, method=method, headers=headers or {})
    try:
        with request.urlopen(req, timeout=35) as response:
            raw = response.read()
            return json.loads(raw) if raw else None
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")[:450]
        raise RuntimeError(f"HTTP {exc.code}: {detail}") from None


def get_auth(url, key):
    email = input("MyFounderHQ email: ").strip()
    password = getpass.getpass("MyFounderHQ password (not saved): ")
    if not email or not password:
        raise ValueError("An email and password are required.")
    body = {"email": email, "password": password, "gotrue_meta_security": {}}
    headers = {"apikey": key, "Content-Type": "application/json"}
    result = api(url + "/auth/v1/token?grant_type=password", "POST", body, headers)
    if not result or not result.get("access_token") or not result.get("user", {}).get("id"):
        raise RuntimeError("Authentication did not return a valid session.")
    return result["access_token"], result["user"]["id"]


def run_adb(args, serial=None):
    prefix = ["adb"] + (["-s", serial] if serial else [])
    try:
        return subprocess.run(prefix + args, capture_output=True, timeout=35, check=True)
    except FileNotFoundError:
        raise RuntimeError("adb was not found. Install Android platform-tools and add adb to PATH.") from None
    except subprocess.CalledProcessError as exc:
        raise RuntimeError("ADB failed: " + exc.stderr.decode("utf-8", "replace")[:400]) from None


def connected_phone(serial):
    devices = run_adb(["devices"]).stdout.decode("utf-8", "replace").splitlines()[1:]
    available = [line.split()[0] for line in devices if line.strip().endswith("\tdevice")]
    if serial:
        if serial not in available:
            raise RuntimeError(f"Phone {serial} is not authorized/connected to ADB.")
        return serial
    if len(available) != 1:
        raise RuntimeError(f"Connect and authorize exactly one phone or specify --serial. Available: {available}")
    return available[0]


def main():
    parser = argparse.ArgumentParser(description="Upload Galaxy S9 app screenshots to MyFounderHQ via Supabase")
    parser.add_argument("--list-apps", action="store_true", help="List reference apps already created in MyFounderHQ")
    parser.add_argument("--app", help="Existing reference app name (e.g. Instagram)")
    parser.add_argument("--app-id", help="Existing reference app UUID (alternative to --app)")
    parser.add_argument("--screen", default="Screen", help="Screen label")
    parser.add_argument("--serial", help="ADB device serial if more than one device is connected")
    parser.add_argument("--count", type=int, default=1, help="Number of sequential screenshots (max 30)")
    parser.add_argument("--interval", type=float, default=3.0, help="Seconds between captures (min 1)")
    parser.add_argument("--delay", type=float, default=0.0, help="Seconds before the first capture")
    parser.add_argument("--url", default=os.getenv("SUPABASE_URL"), help="Supabase project URL")
    parser.add_argument("--key", default=os.getenv("SUPABASE_PUBLISHABLE_KEY") or os.getenv("SUPABASE_ANON_KEY"), help="Public Supabase key")
    args = parser.parse_args()
    if not args.url or not args.key:
        parser.error("Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (public key) in your environment.")
    if not args.list_apps and not (args.app or args.app_id):
        parser.error("Specify --app NAME or --app-id UUID, or use --list-apps.")
    if not 1 <= args.count <= 30 or not 1 <= args.interval <= 3600 or args.delay < 0:
        parser.error("Count must be 1–30, interval 1–3600 seconds, and delay >= 0.")
    base = args.url.rstrip("/")
    token, user_id = get_auth(base, args.key)
    headers = {"apikey": args.key, "Authorization": "Bearer " + token}
    apps = api(base + "/rest/v1/hq_reference_apps?select=id,name,platform,android_package&order=created_at.desc", headers=headers)
    if args.list_apps:
        if not apps:
            print("No reference apps. Create one in Media Magic → App Screenshot Library first.")
        for app in apps or []:
            print(f"{app['name']} | {app['id']} | {app['platform']} | {app['android_package']}")
        return
    selected = next((app for app in (apps or []) if app["id"] == args.app_id), None) if args.app_id else None
    if not selected and args.app:
        matches = [a for a in (apps or []) if a["name"].casefold() == args.app.strip().casefold()]
        if len(matches) != 1:
            raise RuntimeError("Reference app not found or ambiguous. Create it in MyFounderHQ, then run --list-apps.")
        selected = matches[0]
    if not selected:
        raise RuntimeError("Reference app not found in your Supabase account. Run --list-apps.")
    serial = connected_phone(args.serial)
    model = run_adb(["shell", "getprop", "ro.product.model"], serial).stdout.decode("utf-8","replace").strip()[:100]
    print(f"ADB connected: {model} [{serial}]")
    print(f"Destination: {selected['name']} ({selected['id']})")
    print("Only capture reference apps/screens you have permission to document. Close sensitive screens.")
    if args.delay:
        time.sleep(args.delay)
    for i in range(args.count):
        if i:
            print(f"Next capture in {args.interval:g}s. Navigate to the next screen on the phone.")
            time.sleep(args.interval)
        png = run_adb(["exec-out", "screencap", "-p"], serial).stdout
        if not png.startswith(PNG_HEADER) or len(png) > 10*1024*1024:
            raise RuntimeError("ADB did not return a valid PNG under 10 MB.")
        name = args.screen + (f" {i+1}" if args.count > 1 else "")
        file_name = re.sub(r"[^\w.-]+", "_", name)[:100] + ".png"
        path = f"{user_id}/{selected['id']}/{uuid.uuid4()}.png"
        upload_headers = dict(headers, **{"Content-Type": "image/png", "x-upsert": "false"})
        api(base + "/storage/v1/object/" + BUCKET + "/" + path, "POST", png, upload_headers)
        record = {
            "user_id": user_id, "app_id": selected["id"], "storage_path": path,
            "screen_name": name[:180], "original_name": file_name,
            "capture_method": "ADB", "device_name": model, "file_size": len(png),
            "sequence_number": int(time.time()) + i,
        }
        try:
            api(base + "/rest/v1/hq_reference_screenshots", "POST", record,
                dict(headers, **{"Content-Type":"application/json","Prefer":"return=minimal"}))
        except Exception:
            try:
                api(base + "/storage/v1/object/" + BUCKET + "/" + path, "DELETE", headers=headers)
            except Exception:
                pass
            raise
        print(f"Saved {i+1}/{args.count}: {name}")
    print("Complete. Refresh Media Magic → App Screenshot Library to view the uploads.")


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, ValueError, KeyboardInterrupt) as exc:
        print("Capture stopped:", exc, file=sys.stderr)
        sys.exit(1)
