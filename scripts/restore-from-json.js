#!/usr/bin/env node

/**
 * Canvas Recovery Script
 * Відновлює canvas з JSON даних скопійованих з браузера Network tab
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('═══════════════════════════════════════════════════════════');
console.log('🔧 Canvas Recovery Tool');
console.log('═══════════════════════════════════════════════════════════\n');
console.log('ІНСТРУКЦІЯ:');
console.log('1. Відкрийте DevTools (F12) → Network tab');
console.log('2. Знайдіть POST запит до /api/canvas/autosave з великим payload');
console.log('3. Request → Payload → скопіюйте JSON');
console.log('4. Вставте тут і натисніть Ctrl+D (двічі Enter)\n');
console.log('═══════════════════════════════════════════════════════════\n');
console.log('Вставте JSON даних (nodes та edges):');

let jsonInput = '';

rl.on('line', (line) => {
  jsonInput += line + '\n';
});

rl.on('close', async () => {
  try {
    // Parse JSON
    const data = JSON.parse(jsonInput.trim());

    if (!data.nodes || !data.edges) {
      console.error('\n❌ Помилка: JSON має містити "nodes" та "edges"');
      process.exit(1);
    }

    console.log('\n📊 Знайдено:');
    console.log(`  Nodes: ${data.nodes.length}`);
    console.log(`  Edges: ${data.edges.length}`);

    // Prepare restore data
    const restoreData = {
      canvasId: '58b61198-31fe-4131-a73a-8393c4645ee0',
      nodes: data.nodes,
      edges: data.edges,
      title: data.title || 'Life Designer UX UI'
    };

    // Call autosave API to restore
    const apiUrl = 'http://localhost:3077/api/canvas/autosave';

    console.log('\n📡 Відправляємо дані на сервер...');

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // You'll need to add your session cookie here
      },
      body: JSON.stringify(restoreData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('\n✅ УСПІШНО ВІДНОВЛЕНО!');
      console.log(`  Canvas ID: ${result.canvasId}`);
      console.log(`  Action: ${result.action}`);
      console.log('\n🎉 Перезавантажте сторінку canvas!');
    } else {
      const error = await response.text();
      console.error('\n❌ Помилка відновлення:', error);

      // Save to file as backup
      const fs = require('fs');
      const backupFile = `canvas-backup-${Date.now()}.json`;
      fs.writeFileSync(backupFile, JSON.stringify(restoreData, null, 2));
      console.log(`\n💾 Дані збережені в: ${backupFile}`);
      console.log('Використайте Import Canvas в UI для відновлення');
    }

  } catch (error) {
    console.error('\n❌ Помилка парсингу JSON:', error.message);
    console.error('Переконайтеся що вставили правильний JSON');
    process.exit(1);
  }
});

console.log('');
