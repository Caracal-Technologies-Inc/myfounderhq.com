import 'package:flutter/material.dart';
import 'hq_blocks.dart';

// A deliberately limited LEGO assembler. It renders only explicitly supported,
// typed Flutter widgets. It never evaluates Dart code copied from the database.
// A screenshot alone does not authorize unseen actions or data mutations.
class HqBlueprintRenderer extends StatelessWidget {
  const HqBlueprintRenderer({
    super.key,
    required this.blueprint,
    this.onNavigate,
    this.onAction,
  });
  final Map<String,dynamic> blueprint;
  final void Function(String route)? onNavigate;
  final void Function(String actionId)? onAction;

  @override
  Widget build(BuildContext context) {
    final nodes=blueprint['nodes'];
    if(nodes is! List) return const Text('Invalid blueprint: nodes must be a list.');
    return ListView(children:[
      for(final raw in nodes)
        if(raw is Map)Padding(
          padding:const EdgeInsets.only(bottom:10),
          child:_render(context,Map<String,dynamic>.from(raw)),
        ),
    ]);
  }

  Widget _render(BuildContext context,Map<String,dynamic> node){
    final kind=node['component']?.toString()??'';
    final props=node['props'] is Map
      ? Map<String,dynamic>.from(node['props'] as Map)
      : <String,dynamic>{};
    String label(String key,[String fallback=''])=>props[key]?.toString()??fallback;
    switch(kind){
      case 'Header Brand':
        return HqBrandLabel(label:label('label'));
      case 'Info Card':
        return HqInfoCard(
          title:label('title'),
          subtitle:label('subtitle'),
          icon:Icons.info_outline,
          onTap:null,
        );
      case 'Footer Copyright':
        return Text('© ${label("year")} ${label("brand")}');
      case 'Left Menu Section Label':
        return Padding(
          padding:const EdgeInsets.fromLTRB(16,20,16,8),
          child:Text(label('label'),style:Theme.of(context).textTheme.titleSmall),
        );
      case 'Left Menu Item':
        final route=label('route');
        return HqLeftMenuItem(
          label:label('label'), icon:Icons.chevron_right,
          selected:props['selected']==true,
          onTap:route.isNotEmpty&&onNavigate!=null?()=>onNavigate!(route):(){},
        );
      case 'Header Icon Action':
        final action=label('action');
        return Align(alignment:Alignment.centerLeft,child:IconButton(
          tooltip:label('tooltip','Action'),
          icon:const Icon(Icons.more_horiz),
          onPressed:action.isNotEmpty&&onAction!=null?()=>onAction!(action):null,
        ));
      default:
        return Text('Unapproved or unsupported component: $kind',
          style:const TextStyle(color:Colors.deepOrange));
    }
  }
}
