import type { Skill } from './skillsApi';
export type { Skill } from './skillsApi';

export type SortMode =
  | 'installs-desc'
  | 'installs-asc'
  | 'name-asc'
  | 'name-desc';

export type SearchState = {
  query: string;
  sort: SortMode;
  loading: boolean;
  error: string | null;
  results: Skill[];
  rawResults: Skill[];
};

export const initialState: SearchState = {
  query: '',
  sort: 'installs-desc',
  loading: false,
  error: null,
  results: [],
  rawResults: [],
};

export type Action =
  | { type: 'queryChanged'; query: string }
  | { type: 'searchStarted' }
  | { type: 'searchSucceeded'; skills: Skill[] }
  | { type: 'searchFailed'; error: string }
  | { type: 'sortChanged'; sort: SortMode }
  | { type: 'cleared' };

export function reducer(state: SearchState, action: Action): SearchState {
  switch (action.type) {
    case 'queryChanged':
      return { ...state, query: action.query };
    case 'searchStarted':
      return { ...state, loading: true, error: null };
    case 'searchSucceeded':
      return {
        ...state,
        loading: false,
        error: null,
        rawResults: action.skills,
        results: sortSkills(action.skills, state.sort),
      };
    case 'searchFailed':
      return {
        ...state,
        loading: false,
        error: action.error,
        rawResults: [],
        results: [],
      };
    case 'sortChanged':
      return {
        ...state,
        sort: action.sort,
        results: sortSkills(state.rawResults, action.sort),
      };
    case 'cleared':
      return initialState;
  }
}

export function sortSkills(skills: Skill[], sort: SortMode): Skill[] {
  const copy = [...skills];
  switch (sort) {
    case 'installs-desc':
      return copy.sort(
        (a, b) =>
          b.installs - a.installs || a.name.localeCompare(b.name),
      );
    case 'installs-asc':
      return copy.sort(
        (a, b) =>
          a.installs - b.installs || a.name.localeCompare(b.name),
      );
    case 'name-asc':
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case 'name-desc':
      return copy.sort((a, b) => b.name.localeCompare(a.name));
  }
}
