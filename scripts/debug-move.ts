import { GameStateManager } from '@proj-tower/logic-core';

async function main() {
  const g = new GameStateManager();
  const state = await g.createInitialState({ floor: 1 });
  console.log('Entities keys:', Object.keys(state.entities).slice(0, 50));
  console.log('Items keys:', Object.keys(state.items));
  console.log('Player:', state.player.x, state.player.y);

  // Simulate moving right until blocked or interaction
  let s = state;
  for (let i = 0; i < 20; i++) {
    const dx = 1; const dy = 0;
    const { handleMove } = await import('@proj-tower/logic-core');
    s = handleMove(s, dx, dy);
    console.log('After move', i+1, 'player pos:', s.player.x, s.player.y, 'interaction:', s.interactionState.type);
    if (s.interactionState.type !== 'none') break;
  }
}

main().catch(console.error);
