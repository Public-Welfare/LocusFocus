// Simple test script for LocusFocus backend
// Run with: node test.js

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3000';

async function test() {
  console.log('🧪 Testing LocusFocus Backend...\n');
  console.log(`📍 Backend URL: ${BASE_URL}\n`);

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing health check...');
    const health = await fetch(`${BASE_URL}/health`);
    const healthData = await health.json();
    console.log('✅ Health:', healthData);
    console.log('');

    // Test 2: Join Room
    console.log('2️⃣ Testing join room...');
    const join = await fetch(`${BASE_URL}/api/rooms/test-room-123/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'alice', username: 'Alice' })
    });
    const joinData = await join.json();
    console.log('✅ Join room:', joinData.success ? 'SUCCESS' : 'FAILED');
    console.log('   Room state:', joinData.room);
    console.log('');

    // Test 3: Get Room State
    console.log('3️⃣ Testing get room state...');
    const room = await fetch(`${BASE_URL}/api/rooms/test-room-123`);
    const roomData = await room.json();
    console.log('✅ Room state:', roomData);
    console.log('');

    // Test 4: Lock User
    console.log('4️⃣ Testing lock user...');
    const lock = await fetch(`${BASE_URL}/api/rooms/test-room-123/lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetUserId: 'alice',
        lockedByUserId: 'bob',
        locked: true
      })
    });
    const lockData = await lock.json();
    console.log('✅ Lock user:', lockData.success ? 'SUCCESS' : 'FAILED');
    console.log('   Lock state:', lockData.lock);
    console.log('');

    // Test 5: Get Lock Status
    console.log('5️⃣ Testing get lock status...');
    const lockStatus = await fetch(`${BASE_URL}/api/rooms/test-room-123/locks/alice`);
    const lockStatusData = await lockStatus.json();
    console.log('✅ Lock status:', lockStatusData);
    console.log('');

    // Test 6: Unlock User
    console.log('6️⃣ Testing unlock user...');
    const unlock = await fetch(`${BASE_URL}/api/rooms/test-room-123/lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetUserId: 'alice',
        lockedByUserId: 'bob',
        locked: false
      })
    });
    const unlockData = await unlock.json();
    console.log('✅ Unlock user:', unlockData.success ? 'SUCCESS' : 'FAILED');
    console.log('');

    console.log('🎉 All tests passed!\n');
    console.log('✨ Your backend is working correctly.\n');
    console.log('Next steps:');
    console.log('1. Configure extension with backend URL:', BASE_URL);
    console.log('2. Enable backend in extension options');
    console.log('3. Set up Mutual Lock with a partner\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('- Is the server running? (npm start)');
    console.error('- Check the backend URL:', BASE_URL);
    console.error('- Check server logs for errors\n');
    process.exit(1);
  }
}

test();
