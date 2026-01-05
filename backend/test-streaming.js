/**
 * Test script for SSE streaming endpoint
 * Run: node test-streaming.js
 */

const http = require('http');

const testTaskTitle = '프로젝트 기획서 작성하기';
const testTaskDescription = '새로운 앱 기획서를 완성해야 합니다';

const options = {
  hostname: 'localhost',
  port: 3001,
  path: `/api/ai/breakdown-stream?taskTitle=${encodeURIComponent(testTaskTitle)}&taskDescription=${encodeURIComponent(testTaskDescription)}`,
  method: 'GET',
  headers: {
    'Accept': 'text/event-stream',
    'Cache-Control': 'no-cache',
  },
};

console.log('🔄 Testing SSE streaming endpoint...');
console.log(`📍 URL: http://${options.hostname}:${options.port}${options.path}\n`);

const req = http.request(options, (res) => {
  console.log(`✅ Connected! Status: ${res.statusCode}`);
  console.log(`📊 Headers:`, res.headers);
  console.log('\n📦 Streaming events:\n');

  let eventCount = 0;
  let subtaskCount = 0;
  let buffer = '';

  res.on('data', (chunk) => {
    buffer += chunk.toString();

    // Parse SSE events (format: "data: {...}\n\n")
    const events = buffer.split('\n\n');
    buffer = events.pop(); // Keep incomplete event in buffer

    events.forEach((event) => {
      if (event.startsWith('data: ')) {
        eventCount++;
        const jsonStr = event.substring(6); // Remove "data: " prefix

        try {
          const data = JSON.parse(jsonStr);

          if (data.type === 'subtask') {
            subtaskCount++;
            console.log(`🎯 [SUBTASK ${subtaskCount}] ${data.subtask.title} (${data.subtask.estimatedMinutes || '?'} min)`);
          } else if (data.type === 'chunk') {
            process.stdout.write('.');
          } else if (data.type === 'complete') {
            console.log(`\n\n✨ [COMPLETE] Received ${data.subtasks.length} subtasks:`);
            data.subtasks.forEach((st, i) => {
              console.log(`   ${i + 1}. ${st.title} (${st.estimatedMinutes || '?'} min)`);
            });
          } else if (data.type === 'error') {
            console.error(`\n❌ [ERROR] ${data.error}`);
          }
        } catch (err) {
          console.error(`⚠️  Failed to parse event: ${jsonStr.substring(0, 50)}...`);
        }
      }
    });
  });

  res.on('end', () => {
    console.log(`\n\n✅ Stream ended. Total events: ${eventCount}, Subtasks: ${subtaskCount}`);
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
  console.log('\n💡 Make sure backend is running on port 3001');
});

req.end();
