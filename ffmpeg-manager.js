const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Cam } = require('onvif');
const { exec } = require('child_process');

const processes = {};

function startStream(name, rtspUrl, io) {
  const streamPath = `streams/${name}`;
  fs.mkdirSync(streamPath, { recursive: true });

  const args = [
    '-i', rtspUrl,
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-tune', 'zerolatency',
    '-f', 'hls',
    '-hls_time', '1',
    '-hls_list_size', '3',
    '-hls_flags', 'delete_segments',
    `${streamPath}/index.m3u8`
  ];

  const ffmpeg = spawn('ffmpeg', args);
  processes[name] = ffmpeg;

  ffmpeg.stderr.on('data', data => {
    if (data.toString().includes('frame=')) {
      generateThumbnail(name, rtspUrl);
      io.emit('status', { name, status: 'online' });
    }
  });

  ffmpeg.on('exit', () => {
    io.emit('status', { name, status: 'offline' });
  });
}

function stopStream(name) {
  if (processes[name]) {
    processes[name].kill('SIGINT');
    delete processes[name];
  }
}

function restartCamera(name, url, io) {
  stopStream(name);
  setTimeout(() => startStream(name, url, io), 3000);
}

function generateThumbnail(name, rtspUrl) {
  const thumbnailPath = `streams/${name}.jpg`;
  const cmd = `ffmpeg -y -i ${rtspUrl} -frames:v 1 -q:v 2 -update 1 ${thumbnailPath}`;
  exec(cmd);
}

function rebootCamera(name) {
  const creds = { username: 'admin', password: 'admin' };
  const cam = new Cam({ hostname: name, ...creds }, function(err) {
    if (err) return console.log(`ONVIF error: ${err}`);
    this.reboot((err, res) => {
      if (err) console.log('Reboot error:', err);
      else console.log(`${name} rebooted.`);
    });
  });
}

function rebootAll() {
  Object.keys(processes).forEach(rebootCamera);
}

module.exports = { startStream, stopStream, restartCamera, rebootCamera, rebootAll };