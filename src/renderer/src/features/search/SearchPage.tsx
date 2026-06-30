import { useState } from "react";
import { sortSkills, type Skill } from "../../../../main/searchReducer";
import { FEATURED_SEED_QUERIES, FEATURED_LIMIT } from "./constants";
import { useSkillSearch } from "./useSkillSearch";
import { useFeaturedSkills } from "./useFeaturedSkills";
import { SearchBar } from "./SearchBar";
import { HomeView } from "./HomeView";
import { ResultsView } from "./ResultsView";
import { EmptyResults, ErrorView } from "./SearchStates";

export function SearchPage({
  onAddToInstaller,
}: {
  onAddToInstaller: (skill: Skill) => void;
}) {
  const { state, dispatch } = useSkillSearch();
  const featured = useFeaturedSkills(FEATURED_SEED_QUERIES, FEATURED_LIMIT);
  const [showHint, setShowHint] = useState(false);

  const isHome = state.query.trim().length < 2 && !state.loading;
  const sortedFeatured = sortSkills(featured.skills, state.sort);

  function addSkill(s: Skill) {
    onAddToInstaller(s);
    setShowHint(true);
    window.setTimeout(() => setShowHint(false), 2000);
  }

  return (
    <div className="flex h-full flex-col bg-canvas">
      <SearchBar
        query={state.query}
        onQueryChange={(query) => dispatch({ type: "queryChanged", query })}
        loading={state.loading}
        sort={state.sort}
        onSortChange={(sort) => dispatch({ type: "sortChanged", sort })}
        onClear={() => dispatch({ type: "cleared" })}
        clearDisabled={!state.query && state.rawResults.length === 0}
      />

      <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
        {isHome ? (
          <HomeView
            onPick={(query) => dispatch({ type: "queryChanged", query })}
            featured={sortedFeatured}
            featuredLoading={featured.loading}
            sort={state.sort}
            onAdd={addSkill}
            onRetry={featured.retry}
          />
        ) : state.error ? (
          <ErrorView error={state.error} />
        ) : state.results.length === 0 && !state.loading ? (
          <EmptyResults query={state.query} />
        ) : (
          <ResultsView results={state.results} onAdd={addSkill} />
        )}
      </div>

      {showHint && (
        <div
          role="status"
          className="border-t border-accent bg-accent-soft px-4 py-2 text-[12px] text-accent"
        >
          ✓ Added to your list. Switch to the <strong>Installer</strong> tab to
          install.
        </div>
      )}
    </div>
  );
}
