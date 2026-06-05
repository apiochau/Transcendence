import { useEffect, useMemo, useState } from 'react';
import { CollectionItem, CollectionResponse, WordRarity, getMyCollection } from '../api/collection';

const rarityLabels: Record<WordRarity, string> = {
  common: 'Commun',
  uncommon: 'Peu commun',
  rare: 'Rare',
  epic: 'Epique',
  legendary: 'Legendaire',
};

const rarityClasses: Record<WordRarity, string> = {
  common: 'border-slate-600 bg-slate-900 text-slate-100',
  uncommon: 'border-emerald-500 bg-emerald-950/35 text-emerald-100',
  rare: 'border-sky-500 bg-sky-950/35 text-sky-100',
  epic: 'border-violet-500 bg-violet-950/35 text-violet-100',
  legendary: 'border-amber-400 bg-amber-950/35 text-amber-100',
};

const rarityOrder: WordRarity[] = ['legendary', 'epic', 'rare', 'uncommon', 'common'];

export function CollectionPage() {
  const [collection, setCollection] = useState<CollectionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    getMyCollection()
      .then((data) => {
        if (isMounted) {
          setCollection(data);
          setError(null);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError('Impossible de charger la collection.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const groupedItems = useMemo(() => {
    const groups = new Map<WordRarity, CollectionItem[]>();
    for (const rarity of rarityOrder) {
      groups.set(rarity, []);
    }

    for (const item of collection?.items ?? []) {
      groups.get(item.rarity)?.push(item);
    }

    return groups;
  }, [collection]);

  const rarityTotals = useMemo(() => rarityOrder.map((rarity) => {
    const items = groupedItems.get(rarity) ?? [];
    return {
      rarity,
      count: items.reduce((total, item) => total + item.quantity, 0),
      value: items.reduce((total, item) => total + item.totalValue, 0),
    };
  }), [groupedItems]);

  return (
    <section className="page-enter">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Inventaire</p>
          <h1 className="mt-2 text-3xl font-bold">Collection de mots</h1>
          <p className="mt-2 text-sm text-slate-500">
            Chaque victoire en ligne ajoute le mot secret trouve a ta collection.
          </p>
        </div>
      </div>

      {loading && <div className="card-surface mt-8 p-6 text-slate-500">Chargement...</div>}
      {error && <div className="card-surface mt-8 border-red-500 p-6 font-semibold text-red-200">{error}</div>}

      {collection && (
        <>
          <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="card-surface p-7">
              <p className="text-sm font-semibold text-slate-500">Valeur totale</p>
              <p className="mt-3 text-5xl font-black text-accent">{collection.totalValue}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-slate-700 bg-slate-900 p-4">
                  <p className="text-sm font-semibold text-slate-500">Mots uniques</p>
                  <p className="mt-2 text-2xl font-black">{collection.uniqueCount}</p>
                </div>
                <div className="rounded-md border border-slate-700 bg-slate-900 p-4">
                  <p className="text-sm font-semibold text-slate-500">Mots gagnes</p>
                  <p className="mt-2 text-2xl font-black">{collection.totalCount}</p>
                </div>
              </div>
            </div>

            <div className="panel-surface p-5">
              <h2 className="font-bold">Repartition</h2>
              <div className="mt-4 grid gap-2">
                {rarityTotals.map((total) => (
                  <div key={total.rarity} className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2">
                    <div className="flex items-center justify-between gap-3 text-sm font-semibold">
                      <span>{rarityLabels[total.rarity]}</span>
                      <span className="text-slate-400">{total.count} mots</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{
                          width: `${collection.totalValue > 0 ? Math.max(6, (total.value / collection.totalValue) * 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-6">
            {rarityOrder.map((rarity) => {
              const items = groupedItems.get(rarity) ?? [];
              if (items.length === 0) {
                return null;
              }

              return (
                <section key={rarity} className="panel-surface p-6">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xl font-bold">{rarityLabels[rarity]}</h2>
                    <span className="rounded-md border border-slate-700 px-3 py-1 text-sm font-semibold text-slate-400">
                      {items.length}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {items.map((item, index) => (
                      <article
                        key={item.id}
                        className={`interactive-card stagger-item rounded-md border p-4 ${rarityClasses[item.rarity]}`}
                        style={{ animationDelay: `${index * 45}ms` }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-xl font-black">{item.text}</h3>
                            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] opacity-75">
                              {rarityLabels[item.rarity]}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-70">Valeur</p>
                            <p className="text-2xl font-black">{item.value}</p>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-3 text-sm font-semibold opacity-85">
                          <span>{item.category ?? 'mot'}</span>
                          <span>Total {item.totalValue} | x{item.quantity}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}

            {collection.items.length === 0 && (
              <div className="card-surface p-6">
                <h2 className="text-xl font-bold">Aucun mot pour le moment</h2>
                <p className="mt-2 text-slate-500">Gagne une partie en ligne pour obtenir ton premier mot.</p>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
