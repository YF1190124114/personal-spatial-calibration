import assert from 'node:assert/strict';
import { test } from 'node:test';
import { containRect, project, quality, summarize } from '../.pose-test/pose/poseMath.js';
test('empty result has no confidence and no person', () => assert.deepEqual(summarize([]), {status:'Person not detected', confidence:null}));
test('confidence uses weaker visibility or presence; missing scores do not imply certainty', () => { assert.equal(quality({x:0,y:0,visibility:.9,presence:.2}), .2); assert.equal(quality({x:0,y:0}),0); assert.equal(quality({x:0,y:0,visibility:.8}),.8); });
test('one hidden highlighted landmark makes tracking uncertain even with a high average', () => { const p=Array.from({length:33},()=>({x:.5,y:.5,visibility:1,presence:1})); assert.equal(summarize(p).status,'Person detected'); p[7].visibility=.1; assert.equal(summarize(p).status,'Tracking uncertain'); assert.equal(summarize(p).confidence,.82); });
test('portrait container letterboxes landscape video and mirrors within the video rectangle', () => { const r=containRect(400,600,1280,720); assert.deepEqual(r,{x:0,y:187.5,width:400,height:225}); assert.deepEqual(project({x:.25,y:.5},r,false),{x:100,y:300}); assert.deepEqual(project({x:.25,y:.5},r,true),{x:300,y:300}); });
test('wide container pillarboxes portrait video', () => { const r=containRect(800,450,720,1280); assert.equal(r.height,450); assert.equal(r.width,253.125); assert.equal(r.x,273.4375); });
