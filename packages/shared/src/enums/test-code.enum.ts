export enum TestCode {
  // 필수 검사
  // BFI-2는 저작권이 있어 선정 원칙("가능하면 공개적으로 사용 가능한 검사를 우선 사용")에 따라
  // 완전한 공개 도메인인 IPIP-50(Goldberg, 1992)으로 대체했다.
  IPIP50 = 'IPIP50',
  PHQ9 = 'PHQ9',
  GAD7 = 'GAD7',
  PSS10 = 'PSS10',
  RSES = 'RSES',
  BRS = 'BRS',
  WHO5 = 'WHO5',
  // 선택 검사
  OCIR = 'OCIR',
  ASRS = 'ASRS',
  PSQI = 'PSQI',
  FMPS = 'FMPS',
  ECRRS = 'ECRRS',
  DERS = 'DERS',
  BIS11 = 'BIS11',
  CBI = 'CBI',
  AQ = 'AQ',
}

export enum TestCategory {
  ESSENTIAL = 'ESSENTIAL',
  OPTIONAL = 'OPTIONAL',
}

export const ESSENTIAL_TEST_CODES: readonly TestCode[] = [
  TestCode.IPIP50,
  TestCode.PHQ9,
  TestCode.GAD7,
  TestCode.PSS10,
  TestCode.RSES,
  TestCode.BRS,
  TestCode.WHO5,
];
