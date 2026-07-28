import { checkRisk } from './risk-detector';

describe('checkRisk', () => {
  const riskFlags = [{ questionId: 'q9', triggerValue: 1, message: '위기 안내 메시지' }];

  it('임계값 이상 응답 시 위험을 감지한다', () => {
    expect(checkRisk(riskFlags, 'q9', 1)).toEqual({ triggered: true, message: '위기 안내 메시지' });
    expect(checkRisk(riskFlags, 'q9', 3)).toEqual({ triggered: true, message: '위기 안내 메시지' });
  });

  it('임계값 미만이거나 해당 문항이 아니면 감지하지 않는다', () => {
    expect(checkRisk(riskFlags, 'q9', 0)).toEqual({ triggered: false, message: null });
    expect(checkRisk(riskFlags, 'q1', 3)).toEqual({ triggered: false, message: null });
  });
});
