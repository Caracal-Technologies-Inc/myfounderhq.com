import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'hq_blocks.dart';

final _db = Supabase.instance.client;

class HqBusinessesPage extends StatefulWidget {
  const HqBusinessesPage({super.key});
  @override
  State<HqBusinessesPage> createState() => _HqBusinessesPageState();
}

class _HqBusinessesPageState extends State<HqBusinessesPage> {
  late Future<List<dynamic>> _businesses;
  @override
  void initState() {
    super.initState();
    _reload();
  }
  void _reload() {
    _businesses = _db.from('hq_businesses').select('id,name,description').order('created_at');
  }

  Future<void> _addBusiness() async {
    final controller = TextEditingController();
    final name = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add business'),
        content: TextField(
          controller: controller,
          maxLength: 180,
          autofocus: true,
          decoration: const InputDecoration(labelText: 'Business name'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(context, controller.text.trim()), child: const Text('Add business')),
        ],
      ),
    );
    controller.dispose();
    if (name == null || name.isEmpty || !mounted) return;
    try {
      await _db.from('hq_businesses').insert({
        'user_id': _db.auth.currentUser!.id,
        'name': name,
      });
      setState(_reload);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Could not add business: $e')));
    }
  }

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Row(children: [
        Expanded(child: Text('Businesses', style: Theme.of(context).textTheme.headlineMedium)),
        FilledButton.icon(onPressed: _addBusiness, icon: const Icon(Icons.add), label: const Text('Add business')),
      ]),
      const SizedBox(height: 20),
      Expanded(child: FutureBuilder<List<dynamic>>(
        future: _businesses,
        builder: (context, snapshot) {
          if (snapshot.hasError) return Text('Could not load businesses: ${snapshot.error}');
          if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
          final businesses = snapshot.data!;
          if (businesses.isEmpty) return const Text('No businesses added yet.');
          return ListView.builder(
            itemCount: businesses.length,
            itemBuilder: (context, index) {
              final business = Map<String, dynamic>.from(businesses[index] as Map);
              return _BusinessRow(business: business);
            },
          );
        },
      )),
    ],
  );
}

class _BusinessRow extends StatelessWidget {
  const _BusinessRow({required this.business});
  final Map<String,dynamic> business;
  @override
  Widget build(BuildContext context) {
    final id = business['id'] as String;
    return Card(child: Padding(
      padding: const EdgeInsets.all(16),
      child: LayoutBuilder(builder: (context, bounds) {
        final narrow = bounds.maxWidth < 620;
        final name = Text(business['name']?.toString() ?? '',
          style: Theme.of(context).textTheme.titleMedium);
        final tasks = _BusinessTasks(businessId: id);
        final files = _BusinessFiles(businessId: id);
        if (narrow) return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [name,const SizedBox(height: 12),tasks,const Divider(),files],
        );
        return Row(crossAxisAlignment: CrossAxisAlignment.start,children: [
          Expanded(flex: 3,child: name),
          const SizedBox(width: 16),
          Expanded(flex: 4,child: tasks),
          const SizedBox(width: 16),
          Expanded(flex: 4,child: files),
        ]);
      }),
    ));
  }
}

class _BusinessTasks extends StatefulWidget {
  const _BusinessTasks({required this.businessId});
  final String businessId;
  @override
  State<_BusinessTasks> createState()=>_BusinessTasksState();
}
class _BusinessTasksState extends State<_BusinessTasks> {
  late Future<List<dynamic>> _future;
  @override
  void initState(){super.initState();_load();}
  void _load(){_future=_db.from('hq_business_tasks').select('id,title,status').eq('business_id',widget.businessId).order('created_at');}
  Future<void> _add() async {
    final ctrl=TextEditingController();
    final title=await showDialog<String>(context:context,builder:(context)=>AlertDialog(
      title:const Text('Add task'),
      content:TextField(controller:ctrl,autofocus:true,decoration:const InputDecoration(labelText:'Task name')),
      actions:[
        TextButton(onPressed:()=>Navigator.pop(context),child:const Text('Cancel')),
        FilledButton(onPressed:()=>Navigator.pop(context,ctrl.text.trim()),child:const Text('Add task')),
      ],
    ));
    ctrl.dispose();
    if(title==null||title.isEmpty)return;
    try{
      await _db.from('hq_business_tasks').insert({'user_id':_db.auth.currentUser!.id,'business_id':widget.businessId,'title':title});
      if(mounted)setState(_load);
    }catch(e){if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text('Could not add task: $e')));}
  }
  @override
  Widget build(BuildContext context)=>Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
    Row(children:[const Expanded(child:Text('Business tasks',style:TextStyle(fontWeight:FontWeight.w700))),IconButton(tooltip:'Add task',onPressed:_add,icon:const Icon(Icons.add))]),
    FutureBuilder<List<dynamic>>(future:_future,builder:(context,snapshot){
      if(snapshot.hasError)return Text('Could not load tasks: ${snapshot.error}');
      if(!snapshot.hasData)return const LinearProgressIndicator();
      if(snapshot.data!.isEmpty)return const Text('No tasks yet');
      return Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
        for(final task in snapshot.data!.take(8))
          Padding(padding:const EdgeInsets.symmetric(vertical:5),child:Text((task as Map)['title'].toString())),
        if(snapshot.data!.length>8)Text('${snapshot.data!.length-8} more tasks'),
      ]);
    }),
  ]);
}

class _BusinessFiles extends StatelessWidget {
  const _BusinessFiles({required this.businessId});
  final String businessId;
  @override
  Widget build(BuildContext context)=>Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
    const Text('Business files',style:TextStyle(fontWeight:FontWeight.w700)),
    const SizedBox(height:12),
    FutureBuilder<List<dynamic>>(
      future:_db.from('hq_business_files').select('id').eq('business_id',businessId),
      builder:(context,snapshot){
        if(snapshot.hasError)return Text('Could not load files: ${snapshot.error}');
        if(!snapshot.hasData)return const LinearProgressIndicator();
        return Text(snapshot.data!.isEmpty?'No files yet':'${snapshot.data!.length} stored files');
      },
    ),
  ]);
}

class HqEmployeesPage extends StatelessWidget {
  const HqEmployeesPage({super.key});
  Future<Map<String,dynamic>> _load() async {
    final results=await Future.wait([
      _db.from('hq_ai_departments').select('id,name,sort_order').order('sort_order'),
      _db.from('hq_ai_employee_templates').select('id,name,department_id').order('id'),
      _db.from('hq_ai_employee_instances').select('template_id,is_live,status').isFilter('business_id',null),
    ]);
    return {'departments':results[0],'templates':results[1],'instances':results[2]};
  }
  @override
  Widget build(BuildContext context)=>Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
    Text('Employees',style:Theme.of(context).textTheme.headlineMedium),
    const SizedBox(height:20),
    Expanded(child:FutureBuilder<Map<String,dynamic>>(
      future:_load(),
      builder:(context,snapshot){
        if(snapshot.hasError)return Text('Could not load employees: ${snapshot.error}');
        if(!snapshot.hasData)return const Center(child:CircularProgressIndicator());
        final data=snapshot.data!;
        final departments=(data['departments'] as List).cast<Map<String,dynamic>>();
        final roles=(data['templates'] as List).cast<Map<String,dynamic>>();
        final instances=(data['instances'] as List).cast<Map<String,dynamic>>();
        final liveIds=instances.where((i)=>i['is_live']==true).map((i)=>i['template_id']).toSet();
        final live=roles.where((r)=>liveIds.contains(r['id'])).toList();
        return ListView(children:[
          Text('Live Employees',style:Theme.of(context).textTheme.titleMedium),
          for(final r in live) ListTile(
            leading:const Icon(Icons.circle,size:12,color:Colors.green),
            title:Text(r['name'].toString()),
            subtitle:Text(departments.where((d)=>d['id']==r['department_id']).map((d)=>d['name']).firstOrNull?.toString()??''),
            trailing:const Text('Live-listed'),
          ),
          const SizedBox(height:18),
          Text('Employee Directory',style:Theme.of(context).textTheme.titleMedium),
          const SizedBox(height:8),
          for(final dept in departments) ...[
            Container(color:HqPalette.lilac,padding:const EdgeInsets.all(12),
              child:Text(dept['name'].toString(),style:const TextStyle(fontWeight:FontWeight.w700))),
            for(final r in roles.where((r)=>r['department_id']==dept['id']&&!liveIds.contains(r['id'])))
              ListTile(title:Text(r['name'].toString()),trailing:const Icon(Icons.chevron_right)),
            const SizedBox(height:12),
          ],
        ]);
      },
    )),
  ]);
}

class HqComponentCataloguePage extends StatelessWidget {
  const HqComponentCataloguePage({super.key});
  @override
  Widget build(BuildContext context)=>Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
    Text('Flutter Building Blocks',style:Theme.of(context).textTheme.headlineMedium),
    const SizedBox(height:5),
    const Text('Exact source templates imported from Airtable. Imported is not the same as tested.'),
    const SizedBox(height:18),
    Expanded(child:FutureBuilder<List<dynamic>>(
      future:_db.from('hq_flutter_component_sources')
        .select('source_table_name,component_name,description,dart_template,parameters,lifecycle_status')
        .order('source_table_name').order('component_name'),
      builder:(context,snapshot){
        if(snapshot.hasError)return Text('Could not load library: ${snapshot.error}');
        if(!snapshot.hasData)return const Center(child:CircularProgressIndicator());
        final rows=snapshot.data!.cast<Map<String,dynamic>>();
        if(rows.isEmpty)return const Text('No components imported.');
        return ListView(children:[
          for(final category in rows.map((r)=>r['source_table_name'].toString()).toSet())...[
            Padding(padding:const EdgeInsets.symmetric(vertical:12),
              child:Text(category,style:Theme.of(context).textTheme.titleLarge)),
            for(final row in rows.where((r)=>r['source_table_name']==category))
              HqInfoCard(
                title:row['component_name'].toString(),
                subtitle:'${row['lifecycle_status']} · ${row['description']}',
                icon:Icons.widgets_outlined,
                onTap:()=>showDialog<void>(context:context,builder:(context)=>AlertDialog(
                  title:Text(row['component_name'].toString()),
                  content:SizedBox(width:650,child:SingleChildScrollView(
                    child:SelectableText(row['dart_template'].toString()))),
                  actions:[TextButton(onPressed:()=>Navigator.pop(context),child:const Text('Close'))],
                )),
              ),
          ],
        ]);
      },
    )),
  ]);
}

class HqSettingsPage extends StatelessWidget {
  const HqSettingsPage({super.key});
  @override
  Widget build(BuildContext context)=>Column(crossAxisAlignment:CrossAxisAlignment.start,children:[
    Text('Settings',style:Theme.of(context).textTheme.headlineMedium),
    const SizedBox(height:18),
    HqInfoCard(title:'Signed in',
      subtitle:_db.auth.currentUser?.email??'Unknown email',
      icon:Icons.account_circle_outlined),
    const SizedBox(height:16),
    OutlinedButton.icon(
      icon:const Icon(Icons.logout),
      label:const Text('Sign out'),
      onPressed:() async => _db.auth.signOut(),
    ),
    const SizedBox(height:12),
    const Text('Additional account controls remain on the existing production web app until specified and tested for Flutter.'),
  ]);
}
