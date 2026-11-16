import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:myfounderhq_flutter/hq_blocks.dart';
import 'package:myfounderhq_flutter/blueprint_renderer.dart';

void main() {
  testWidgets('Header Brand renders an approved label', (tester) async {
    await tester.pumpWidget(const MaterialApp(home:Scaffold(
      body:HqBrandLabel(label:'MYFOUNDERHQ™'),
    )));
    expect(find.text('MYFOUNDERHQ™'),findsOneWidget);
  });

  testWidgets('Info Card uses the actual approved text properties', (tester) async {
    await tester.pumpWidget(const MaterialApp(home:Scaffold(
      body:HqInfoCard(title:'Business',subtitle:'From Supabase',icon:Icons.business),
    )));
    expect(find.text('Business'),findsOneWidget);
    expect(find.text('From Supabase'),findsOneWidget);
  });

  testWidgets('Unknown code cannot silently render an invented block', (tester) async {
    await tester.pumpWidget(MaterialApp(home:Scaffold(
      body:HqBlueprintRenderer(blueprint:{
        'nodes':[{'component':'Unreviewed Widget','props':{'title':'No'}}],
      }),
    )));
    expect(find.text('Unapproved or unsupported component: Unreviewed Widget'),findsOneWidget);
  });
}
