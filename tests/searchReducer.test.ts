import { describe, it, expect } from 'vitest';
import {
  reducer,
  initialState,
  sortSkills,
  type SearchState,
  type Skill,
  type SortMode,
} from '../src/main/searchReducer';

const skill = (
  skillId: string,
  installs: number,
  source = 'a/b',
): Skill => ({
  id: `${source}/${skillId}`,
  skillId,
  name: skillId,
  source,
  installs,
});

const sample: Skill[] = [
  skill('alpha', 100),
  skill('beta', 50),
  skill('gamma', 250),
];

describe('initialState', () => {
  it('is empty, idle, sorted by installs-desc', () => {
    expect(initialState).toEqual({
      query: '',
      sort: 'installs-desc',
      loading: false,
      error: null,
      results: [],
      rawResults: [],
    });
  });
});

describe('reducer', () => {
  it('queryChanged updates the query without firing a request', () => {
    const next = reducer(initialState, { type: 'queryChanged', query: 'rea' });
    expect(next.query).toBe('rea');
    expect(next.loading).toBe(false);
  });

  it('searchStarted sets loading=true and clears prior error', () => {
    const dirty: SearchState = { ...initialState, error: 'oops' };
    const next = reducer(dirty, { type: 'searchStarted' });
    expect(next.loading).toBe(true);
    expect(next.error).toBeNull();
  });

  it('searchSucceeded stores raw results and applies current sort', () => {
    const start: SearchState = {
      ...initialState,
      loading: true,
      sort: 'installs-desc',
    };
    const next = reducer(start, {
      type: 'searchSucceeded',
      skills: sample,
    });
    expect(next.loading).toBe(false);
    expect(next.rawResults).toEqual(sample);
    expect(next.results.map((s) => s.skillId)).toEqual([
      'gamma',
      'alpha',
      'beta',
    ]);
  });

  it('searchFailed records error and stops loading', () => {
    const start: SearchState = { ...initialState, loading: true };
    const next = reducer(start, {
      type: 'searchFailed',
      error: 'boom',
    });
    expect(next.loading).toBe(false);
    expect(next.error).toBe('boom');
    expect(next.results).toEqual([]);
  });

  it('sortChanged re-sorts existing rawResults without re-fetching', () => {
    const start: SearchState = {
      ...initialState,
      rawResults: sample,
      results: sortSkills(sample, 'installs-desc'),
      sort: 'installs-desc',
    };
    const next = reducer(start, {
      type: 'sortChanged',
      sort: 'name-asc',
    });
    expect(next.sort).toBe('name-asc');
    expect(next.results.map((s) => s.skillId)).toEqual([
      'alpha',
      'beta',
      'gamma',
    ]);
    expect(next.rawResults).toEqual(sample);
  });

  it('cleared resets the state to initial', () => {
    const start: SearchState = {
      ...initialState,
      query: 'react',
      rawResults: sample,
      results: sample,
      error: 'old',
      loading: true,
    };
    expect(reducer(start, { type: 'cleared' })).toEqual(initialState);
  });
});

describe('sortSkills', () => {
  it('sorts by installs descending (featured / most installed)', () => {
    expect(sortSkills(sample, 'installs-desc').map((s) => s.installs)).toEqual([
      250, 100, 50,
    ]);
  });

  it('sorts by installs ascending', () => {
    expect(sortSkills(sample, 'installs-asc').map((s) => s.installs)).toEqual([
      50, 100, 250,
    ]);
  });

  it('sorts by name ascending', () => {
    expect(sortSkills(sample, 'name-asc').map((s) => s.skillId)).toEqual([
      'alpha',
      'beta',
      'gamma',
    ]);
  });

  it('sorts by name descending', () => {
    expect(sortSkills(sample, 'name-desc').map((s) => s.skillId)).toEqual([
      'gamma',
      'beta',
      'alpha',
    ]);
  });

  it('is non-mutating', () => {
    const original = [...sample];
    sortSkills(sample, 'installs-asc');
    expect(sample).toEqual(original);
  });

  it('breaks install-count ties by name alphabetically', () => {
    const tied = [skill('zeta', 100), skill('alpha', 100), skill('beta', 100)];
    const r = sortSkills(tied, 'installs-desc');
    expect(r.map((s) => s.skillId)).toEqual(['alpha', 'beta', 'zeta']);
  });

  it.each(['installs-desc', 'installs-asc', 'name-asc', 'name-desc'] as SortMode[])(
    'handles empty list for sort=%s',
    (mode) => {
      expect(sortSkills([], mode)).toEqual([]);
    },
  );
});
