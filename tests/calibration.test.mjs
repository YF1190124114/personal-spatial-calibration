import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calibrationReducer as reduce, initialState, DIRECTIONS } from '../.pose-test/calibration/machine.js';
const send=(state,type)=>reduce(state,{type});
const start=()=>send(send(initialState,'START'),'READY');
test('eight directions require manual confirmation, three ticks and explicit advancement',()=>{
 let state=start(); assert.deepEqual(DIRECTIONS,[0,45,90,135,180,225,270,315]);
 for(let step=0;step<8;step++) { assert.equal(state.step,step); assert.equal(state.phase,'rotate'); assert.equal(send(state,'TICK'),state); state=send(state,'CONFIRM'); assert.equal(state.count,3); state=send(state,'TICK'); assert.equal(state.count,2); state=send(state,'TICK'); assert.equal(state.count,1); state=send(state,'TICK'); assert.equal(state.phase,'feedback'); assert.equal(state.completed,step+1); state=send(state,'NEXT'); }
 assert.equal(state.phase,'complete'); assert.equal(state.completed,8);
});
test('pause blocks ticking and navigation; resume preserves countdown number',()=>{
 let state=send(send(start(),'CONFIRM'),'TICK');state=send(state,'PAUSE');assert.equal(state.count,2);
 for(const e of ['TICK','CONFIRM','NEXT','PREVIOUS','READY']) assert.equal(send(state,e),state);
 state=send(state,'RESUME');assert.equal(state.count,2);assert.equal(send(state,'TICK').count,1);
});
test('previous invalidates completion from the revisited direction onward',()=>{
 let state={...start(),step:4,completed:4};state=send(state,'PREVIOUS');assert.equal(state.step,3);assert.equal(state.completed,3);assert.equal(state.phase,'rotate');assert.equal(state.count,3);
 state=send({...state,phase:'complete',step:7,completed:8},'PREVIOUS');assert.equal(state.step,7);assert.equal(state.completed,7);
 assert.equal(send(start(),'PREVIOUS').step,0);
});
test('restart and exit work while paused and cancel pending countdown state',()=>{
 const paused=send(send(start(),'CONFIRM'),'PAUSE');assert.deepEqual(send(paused,'RESTART'),{...initialState,phase:'preparation'});assert.deepEqual(send(paused,'EXIT'),initialState);
 assert.deepEqual(send({...initialState,phase:'complete',step:7,completed:8},'EXIT'),initialState);
});
test('out-of-phase and duplicate events cannot skip steps',()=>{
 assert.equal(send(initialState,'CONFIRM'),initialState);let state=start();assert.equal(send(state,'NEXT'),state);state=send(state,'CONFIRM');assert.equal(send(state,'CONFIRM'),state);state=send(send(send(state,'TICK'),'TICK'),'TICK');assert.equal(send(state,'TICK'),state);
});
