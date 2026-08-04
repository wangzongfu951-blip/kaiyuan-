import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('hotspot view exposes public presets and learning detail fields', () => {
  const source = fs.readFileSync('src/views/HotspotView.vue', 'utf8')
  const service = fs.readFileSync('src/services/hotspots-static.ts', 'utf8')
  assert.match(source, /data-testid="hotspot-preset-image"/)
  assert.match(source, /data-testid="hotspot-preset-full"/)
  assert.match(service, /hotspots-\$\{preset\}\.json/)
  assert.match(service, /loadStaticHotspots/)
  for (const label of ['\u8bcd\u4e49', '\u7528\u6cd5\u4e0e\u8bed\u5883', '\u793a\u4f8b', '\u8003\u573a\u7528\u6cd5', '\u5e38\u89c1\u8bef\u7528']) {
    assert.match(source, new RegExp(label))
  }
  assert.match(source, /hotspot-search/)
  assert.match(source, /activeTopic/)
})
