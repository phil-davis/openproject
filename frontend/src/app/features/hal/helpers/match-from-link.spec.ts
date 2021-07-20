import matchFromLink from './match-from-link';

describe('matchFromLink', () => {
  it('properly extracts the match from the href', () => {
    expect(matchFromLink('/api/v3/work-packages/3', 'work-packages')).toEqual('3');
    expect(matchFromLink('/api/v3/work-packages/312312', 'work-packages')).toEqual('312312');
    expect(matchFromLink('/api/v3/work-packages/-312312', 'work-packages')).toEqual(null);
    expect(matchFromLink('/api/v3/work-packages/asdf', 'work-packages')).toEqual(null);
    expect(matchFromLink('/api/v3/work-packages/', 'work-packages')).toEqual(null);
    expect(matchFromLink('/api/v3/work-packages/3', 'asdf')).toEqual(null);
    expect(matchFromLink('/api/v3/api/v3', 'api')).toEqual(null);
    expect(matchFromLink('/api/v3/api/v3/3', 'api')).toEqual(null);
  });
});
