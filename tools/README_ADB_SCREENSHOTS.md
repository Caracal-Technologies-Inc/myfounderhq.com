# MyFounderHQ — Android ADB Reference Screenshot Capture (Acer + Galaxy S9)

This utility is part of the MyFounderHQ **Media Magic → App Screenshot Library**.

It does not run in Vercel or inside ChatGPT. It runs **locally on your Acer** because USB Android Debug Bridge (ADB) requires access to the physical phone.

## 1. Prepare the Samsung Galaxy S9

- Enable Developer options and **USB debugging**.
- Connect the Galaxy S9 to the Acer using a data-capable USB cable.
- Approve the phone's **Allow USB debugging** prompt.
- Install [Android SDK Platform Tools](https://developer.android.com/tools/releases/platform-tools) on Windows and make sure `adb` is accessible on PATH.
- Open PowerShell and check:

```powershell
adb devices
```

You should see one device listed with state `device`, not `unauthorized`.

## 2. Create a reference app collection

Open [MyFounderHQ](https://myfounderhq.com) and choose **Media Magic → App Screenshot Library → Add reference app**.

For example:
- Name: Instagram
- Platform: Android
- Android package: `com.instagram.android`
- Device: Samsung Galaxy S9

You can also open the same library from **MyFounderHQ → Resources → Reference App(s) Screenshot Library**, or from the **Mobile App Developer** employee profile.

## 3. Configure the authenticated capture utility

Copy `tools/adb_capture_to_hq.py` from this repository onto the Acer.

Use Python 3.9 or later. The script only uses Python's standard library and requires the Android Platform Tools to be installed.

Set your **public** Supabase project URL and public publishable key in PowerShell:

```powershell
$env:SUPABASE_URL="https://intkaqcecscmhlduvrbo.supabase.co"
$env:SUPABASE_PUBLISHABLE_KEY="<public Supabase publishable/anon key>"
```

You can find the publishable key at **Supabase Dashboard → Project Settings → API Keys**. **Never use a service-role or secret key on the Acer.**

List the collections you've already created:

```powershell
python .\tools\adb_capture_to_hq.py --list-apps
```

It prompts for the MyFounderHQ email and password via a concealed password prompt. It does not save the password or token to disk.

## 4. Capture a screenshot

Open your reference app on the Galaxy S9 and navigate to the exact screen you want.

```powershell
python .\tools\adb_capture_to_hq.py --app "Instagram" --screen "Home feed"
```

The script captures the current Android display with `adb exec-out screencap -p` and uploads the PNG securely to your signed-in Supabase account.

For a deliberate screenshot series, with three seconds between captures:

```powershell
python .\tools\adb_capture_to_hq.py --app "Instagram" --screen "Reference sequence" --count 5 --interval 3
```

For a 10-second countdown before the first screenshot:

```powershell
python .\tools\adb_capture_to_hq.py --app "Uber Driver" --screen "Job flow" --delay 10
```

Keep screenshots limited to app UI you are authorized to capture. Avoid capturing private messages, personal details, payment information, or third-party private content.

## 5. Storage and access

Screenshot files are stored in the private Supabase bucket `hq-reference-screenshots`, with corresponding records in:
- `public.hq_reference_apps`
- `public.hq_reference_screenshots`

Records include app, screen name, capture method `ADB`, device model, filename, and capture date.

Only authenticated users who own the records can read or write them under Supabase RLS. Private storage previews use expiring signed URLs.

## 6. Known boundaries

- The utility is **manual/explicitly initiated**, not an unattended phone-control agent.
- No remote USB or ADB access from the MyFounderHQ website has been implemented.
- ADB captures screenshot pixels, not a machine-readable interaction manual or all user journeys automatically.
- Screenshot capture from DRM-protected/secure Android screens may return blank images.
- The Mobile App Developer role can access the library, but it does **not** autonomously capture, navigate, or analyze screenshots yet.
- The script and website UI require a real local-device/login test before treating the ADB integration as verified.

## Future workflow

Approved capture session → screenshot sequence → screen labels → UX behavior notes → Flutter component inventory → approved app blueprint → build/test.

Screenshots are reference materials, not authorization to copy proprietary branding, private information, or restricted assets.
