import { SprintStateManager } from '@/features/workout/services/sprint-state-manager';

describe('SprintStateManager', () => {
  it('starts in idle state with empty metrics', () => {
    const manager = new SprintStateManager();

    expect(manager.snapshot()).toEqual({
      status: 'idle',
      startedAt: null,
      endedAt: null,
      distanceM: 0,
    });
  });

  it('transitions to recording and tracks timestamps', () => {
    const manager = new SprintStateManager();

    manager.startRecording();
    manager.noteTimestamp(1000);
    manager.noteTimestamp(1200);

    expect(manager.getStatus()).toBe('recording');
    expect(manager.snapshot().startedAt).toBe(1000);
    expect(manager.snapshot().endedAt).toBe(1200);
  });

  it('accumulates distance only for positive dt', () => {
    const manager = new SprintStateManager();

    manager.startRecording();
    manager.addDistance(3, 0.2);
    manager.addDistance(10, 0);
    manager.addDistance(10, -0.2);

    expect(manager.snapshot().distanceM).toBeCloseTo(0.6, 6);
  });

  it('stops only when currently recording', () => {
    const manager = new SprintStateManager();

    manager.stopRecording();
    expect(manager.getStatus()).toBe('idle');

    manager.startRecording();
    manager.stopRecording();
    expect(manager.getStatus()).toBe('stopped');
  });

  it('reset returns state to initial values', () => {
    const manager = new SprintStateManager();

    manager.startRecording();
    manager.noteTimestamp(1000);
    manager.addDistance(3, 0.2);
    manager.stopRecording();

    manager.reset();

    expect(manager.snapshot()).toEqual({
      status: 'idle',
      startedAt: null,
      endedAt: null,
      distanceM: 0,
    });
  });
});
