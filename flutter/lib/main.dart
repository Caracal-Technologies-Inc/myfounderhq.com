import 'dart:async';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'hq_blocks.dart';
import 'hq_screens.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  const url=String.fromEnvironment('SUPABASE_URL');
  const key=String.fromEnvironment('SUPABASE_ANON_KEY');
  if(url.isEmpty||key.isEmpty){
    runApp(const MaterialApp(home:Scaffold(body:Center(
      child:Text('Configure SUPABASE_URL and SUPABASE_ANON_KEY using --dart-define.'),
    ))));
    return;
  }
  await Supabase.initialize(url:url,anonKey:key);
  runApp(const HqApp());
}

class HqApp extends StatelessWidget {
  const HqApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
    title:'MyFounderHQ — Flutter rebuild',
    debugShowCheckedModeBanner:false,
    theme:ThemeData(
      useMaterial3:true,
      colorScheme:ColorScheme.fromSeed(
        seedColor:HqPalette.purple,
        surface:HqPalette.background,
      ),
      scaffoldBackgroundColor:HqPalette.background,
      cardTheme:CardThemeData(
        color:Colors.white,
        shape:RoundedRectangleBorder(borderRadius:BorderRadius.circular(12)),
      ),
    ),
    home:const HqAuthGate(),
  );
}

class HqAuthGate extends StatefulWidget {
  const HqAuthGate({super.key});
  @override
  State<HqAuthGate> createState()=>_HqAuthGateState();
}
class _HqAuthGateState extends State<HqAuthGate> {
  late final StreamSubscription<AuthState> _subscription;
  Session? _session;
  @override
  void initState(){
    super.initState();
    _session=Supabase.instance.client.auth.currentSession;
    _subscription=Supabase.instance.client.auth.onAuthStateChange.listen((event){
      if(mounted)setState(()=>_session=event.session);
    });
  }
  @override
  void dispose(){_subscription.cancel();super.dispose();}
  @override
  Widget build(BuildContext context) =>
    _session==null?const HqLoginScreen():const HqMainScreen();
}

class HqLoginScreen extends StatefulWidget {
  const HqLoginScreen({super.key});
  @override
  State<HqLoginScreen> createState()=>_HqLoginScreenState();
}
class _HqLoginScreenState extends State<HqLoginScreen> {
  final _email=TextEditingController(),_password=TextEditingController();
  bool _busy=false;
  String _error='';
  @override
  void dispose(){_email.dispose();_password.dispose();super.dispose();}
  Future<void> _login() async {
    if(_busy)return;
    setState((){_busy=true;_error='';});
    try{
      await Supabase.instance.client.auth.signInWithPassword(
        email:_email.text.trim(),password:_password.text,
      );
    }on AuthException catch(e){
      if(mounted)setState(()=>_error=e.message);
    }catch(e){
      if(mounted)setState(()=>_error='Unable to sign in: $e');
    }finally{
      if(mounted)setState(()=>_busy=false);
    }
  }
  @override
  Widget build(BuildContext context)=>Scaffold(body:Center(child:ConstrainedBox(
    constraints:const BoxConstraints(maxWidth:460),
    child:Card(child:Padding(padding:const EdgeInsets.all(25),child:Column(
      mainAxisSize:MainAxisSize.min,
      crossAxisAlignment:CrossAxisAlignment.stretch,
      children:[
        const HqBrandLabel(label:'MYFOUNDERHQ™'),
        const SizedBox(height:20),
        Text('Sign in',style:Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height:15),
        TextField(controller:_email,keyboardType:TextInputType.emailAddress,
          autofillHints:const [AutofillHints.email],decoration:const InputDecoration(labelText:'Email')),
        const SizedBox(height:12),
        TextField(controller:_password,obscureText:true,
          autofillHints:const [AutofillHints.password],
          decoration:const InputDecoration(labelText:'Password'),
          onSubmitted:(_)=>_login()),
        if(_error.isNotEmpty)...[
          const SizedBox(height:10),Text(_error,style:const TextStyle(color:Colors.red)),
        ],
        const SizedBox(height:20),
        FilledButton(onPressed:_busy?null:_login,
          child:Text(_busy?'Signing in…':'Sign in')),
      ],
    ))),
  ))));
}

class HqMainScreen extends StatefulWidget {
  const HqMainScreen({super.key});
  @override
  State<HqMainScreen> createState()=>_HqMainScreenState();
}
class _HqMainScreenState extends State<HqMainScreen> {
  String _page='Businesses';
  bool _financialOpen=false,_toolsOpen=false,_settingsOpen=false;
  List<String> _primary=['Businesses','Employees','Influencers','Social Media Agencies','News Agencies','Calendar'];
  List<String> _financial=['Dashboard','Financial ledger','Profits','Expenditures','Investments','Rewards','Savings'];
  List<String> _tools=['ChatGPT Project Creator','Instagram Account Opener'];
  List<String> _settings=['Settings','Paid Services','Bank accounts','Document wallet','Email wallet','Password wallet','Address wallet'];
  @override
  void initState(){super.initState();_loadNavigation();}
  Future<void> _loadNavigation() async {
    try{
      final user=Supabase.instance.client.auth.currentUser;
      if(user==null)return;
      final result=await Supabase.instance.client.from('hq_navigation_preferences').select().eq('user_id',user.id).maybeSingle();
      if(!mounted||result==null)return;
      List<String> saved(String key,List<String> expected){
        final value=result[key];
        if(value is! List)return expected;
        final items=value.whereType<String>().where(expected.contains).toSet().toList();
        return [...items,...expected.where((e)=>!items.contains(e))];
      }
      setState((){
        _primary=saved('primary_tabs',_primary);
        _financial=saved('financial_tabs',_financial);
        _tools=saved('tools_tabs',_tools);
        _settings=saved('settings_tabs',_settings);
        _financialOpen=result['financial_open']==true;
        _toolsOpen=result['tools_open']==true;
        _settingsOpen=result['settings_open']==true;
      });
    }catch(_){
      // Keep source-derived defaults if the existing navigation preference cannot load.
    }
  }
  void _navigate(String page){
    setState(()=>_page=page);
    if(MediaQuery.sizeOf(context).width<760)Navigator.of(context).maybePop();
  }
  Widget _sidebar(){
    Widget section(String title,bool expanded,VoidCallback toggle,List<String> items)=>Column(
      crossAxisAlignment:CrossAxisAlignment.stretch,
      children:[
        ListTile(title:Text(title,style:const TextStyle(fontWeight:FontWeight.w700)),
          trailing:Icon(expanded?Icons.expand_more:Icons.chevron_right),
          onTap:toggle,tileColor:HqPalette.lilac),
        if(expanded)for(final label in items)
          HqLeftMenuItem(label:label,icon:Icons.chevron_right,
            selected:_page==label,onTap:()=>_navigate(label)),
        const SizedBox(height:12),
      ],
    );
    return HqLeftDrawerShell(
      header:const Padding(padding:EdgeInsets.all(18),
        child:HqBrandLabel(label:'MYFOUNDERHQ™')),
      children:[
        for(final label in _primary)
          HqLeftMenuItem(label:label,icon:Icons.circle_outlined,
            selected:_page==label,onTap:()=>_navigate(label)),
        const SizedBox(height:16),
        section('Financial Overview',_financialOpen,
          ()=>setState(()=>_financialOpen=!_financialOpen),_financial),
        section('Tools',_toolsOpen,()=>setState(()=>_toolsOpen=!_toolsOpen),
          [..._tools,'Flutter Building Blocks']),
        section('Settings',_settingsOpen,
          ()=>setState(()=>_settingsOpen=!_settingsOpen),_settings),
      ],
    );
  }
  Widget _content(){
    switch(_page){
      case 'Businesses':return const HqBusinessesPage();
      case 'Employees':return const HqEmployeesPage();
      case 'Settings':return const HqSettingsPage();
      case 'Flutter Building Blocks':return const HqComponentCataloguePage();
      default:return Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
        Text(_page,style:Theme.of(context).textTheme.headlineMedium),
        const SizedBox(height:16),
        const HqInfoCard(
          title:'Not built in Flutter yet',
          subtitle:'The existing production MyFounderHQ remains available. This screen will be assembled after its component blueprint and interactions are approved.',
          icon:Icons.construction_outlined,
        ),
      ]);
    }
  }
  @override
  Widget build(BuildContext context){
    final desktop=MediaQuery.sizeOf(context).width>=760;
    return Scaffold(
      appBar:desktop?null:AppBar(title:const HqBrandLabel(label:'MYFOUNDERHQ™')),
      drawer:desktop?null:Drawer(child:_sidebar()),
      body:Row(children:[
        if(desktop)SizedBox(width:270,child:Material(
          color:Colors.white,child:_sidebar())),
        Expanded(child:Padding(padding:const EdgeInsets.all(22),child:_content())),
      ]),
    );
  }
}
