import { useDeferredValue, useMemo, useState } from 'react'
import './LibraryPremium.css'
import { useUI } from '../store/useUI.js'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { EXDB, BODYPARTS, allExercises, equipmentOf, byCategory, searchExercises, similarExercises } from '../lib/exercises.js'
import { MUSCLE_NAME } from '../lib/muscles.js'
import { activeProfile, exAvailable } from '../lib/equipment.js'
import { bestWeightFor } from '../lib/history.js'
import { fmtNum } from '../lib/format.js'
import { t, tn, exerciseNameFor, exerciseNameClass } from '../lib/i18n.js'
import { Thumb } from '../components/Media.jsx'
import { exerciseDetailSheet, addToRoutineSheet, customExSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'
import { isFav, sortFavouritesFirst, sortYoursFirst, usageOf } from '../lib/favourites.js'

/**
 * Aura Gym Premium Dark — Exercise Library.
 * Keeps the existing catalogue, ranking, search, equipment availability, user exercises,
 * favorites, history and sheets. Only the view layer is replaced here.
 */
export default function Library() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const [q, setQ] = useState('')
  const [bp, setBp] = useState('')
  const [eq, setEq] = useState('')
  const [cat, setCat] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [shown, setShown] = useState(40)
  const profile = activeProfile(S)
  const ownCount = (S.customEx || []).filter(c => c && c.id).length

  // Keep search and filter semantics from the existing catalogue implementation.
  const inPart = searchExercises(allExercises(S).filter(e => !bp || e.bp === bp), q)
  const { opts: catOpts, on: catOn, list: base } = byCategory(inPart, cat)
  const eqFiltered = (profile && !showAll) ? base.filter(e => exAvailable(S, e)) : base
  const eqOpts = equipmentOf(eqFiltered)
  const eqOn = eqOpts.includes(eq) ? eq : ''
  const narrowedList = eqOn ? eqFiltered.filter(e => e.eq === eqOn) : eqFiltered
  const usage = useMemo(() => (q.trim() ? usageOf(S) : null), [q, S.routines, S.workouts])
  const exercises = usage ? sortYoursFirst(narrowedList, S, usage) : sortFavouritesFirst(narrowedList, S)
  const filtersOn = (catOn ? 1 : 0) + (eqOn ? 1 : 0)
  const narrowed = !!(q.trim() || bp || eqOn || catOn)

  const filtersFor = (nextCat, nextEq) => {
    const by = byCategory(inPart, nextCat)
    const pool = (profile && !showAll) ? by.list.filter(x => exAvailable(S, x)) : by.list
    const opts = equipmentOf(pool)
    return { catOpts: by.opts, catOn: by.on, eqOpts: opts, eqOn: opts.includes(nextEq) ? nextEq : '' }
  }
  const openFilters = () => useUI.getState().openSheet(close => (
    <LibraryFilters
      close={close}
      cat={catOn}
      eq={eqOn}
      filtersFor={filtersFor}
      onChange={(nextCat, nextEq) => { setCat(nextCat); setEq(nextEq); setShown(40) }}
    />
  ))

  // Similar-name suggestions remain available, but are calculated after typing settles.
  const qLate = useDeferredValue(q)
  const similar = q.trim() && qLate === q && exercises.length <= shown
    ? similarExercises(
        allExercises(S).filter(e => (!bp || e.bp === bp) && (!profile || showAll || exAvailable(S, e))),
        q, exercises, exercises.length ? 12 : 30
      )
    : []

  const resetSearch = () => { setQ(''); setShown(40) }
  const exerciseCard = e => {
    const best = bestWeightFor(S, e.id)
    const muscle = MUSCLE_NAME[e.tg] || e.tg || e.bp || ''
    return (
      <article className="aura-ex-card" key={e.id}>
        <button
          type="button"
          className="aura-ex-card-media"
          onClick={() => exerciseDetailSheet(e)}
          aria-label={t('Open exercise') + ': ' + exerciseNameFor(e)}
        >
          <Thumb ex={e} />
          {isFav(S, e.id) && <span className="aura-ex-card-fav" aria-label={t('Favorite')}><Icon name="starFill" /></span>}
        </button>
        <div className="aura-ex-card-body">
          <button type="button" className={`aura-ex-card-title ${exerciseNameClass(e)}`} onClick={() => exerciseDetailSheet(e)}>
            {exerciseNameFor(e)}
          </button>
          <div className="aura-ex-card-meta">{t(muscle)}{e.eq ? ' · ' + t(e.eq) : ''}</div>
          <div className="aura-ex-card-footer">
            <span className="aura-ex-card-load">{best > 0 ? fmtNum(best) : t('Exercise')}</span>
            <button
              type="button"
              className="aura-ex-add"
              aria-label={t('Add to my plan') + ': ' + exerciseNameFor(e)}
              title={t('Add to my plan')}
              onClick={() => addToRoutineSheet(e)}
            ><Icon name="plus" /></button>
          </div>
        </div>
      </article>
    )
  }

  return (
    <main className="aura-library">
      <header className="aura-library-head">
        <div>
          <p className="aura-library-eyebrow">AURA GYM / TRAINING</p>
          <h1 className="aura-library-title">{t('Exercises')}</h1>
          <p className="aura-library-subtitle">
            {ownCount
              ? tn('{1} animated exercises + 1 of your own', '{1} animated exercises + {0} of your own', ownCount, EXDB.length)
              : t('{0} exercises with animations', EXDB.length)}
          </p>
        </div>
        <div className="aura-library-head-actions">
          <button type="button" className="aura-library-action" onClick={() => nav('/muscles')}>
            <Icon name="figureStrength" /> {t('By muscle')}
          </button>
        </div>
      </header>

      <div className="aura-library-searchline" data-tour="lib-search">
        <label className="aura-library-search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          <input
            type="search"
            placeholder={t('Search…')}
            value={q}
            onChange={event => { setQ(event.target.value); setShown(40) }}
            aria-label={t('Search exercises')}
          />
          {narrowed && <span className="aura-library-count" role="status">{fmtNum(exercises.length)}</span>}
          {q && <button type="button" className="aura-library-action" onClick={resetSearch} aria-label={t('Clear')}><Icon name="xmark" /></button>}
        </label>
        <button type="button" className={'aura-library-action' + (filtersOn ? ' is-active' : '')} onClick={openFilters}>
          <Icon name="slider" /> {t('Filters')}{filtersOn ? ` · ${filtersOn}` : ''}
        </button>
      </div>

      {profile && (
        <div className="aura-library-context">
          <Icon name="kettlebell" />
          {showAll ? t('Showing all equipment') : t('Showing what you have in "{0}"', profile.name)}
          <button type="button" onClick={() => setShowAll(value => !value)}>
            {showAll ? t('Filter by "{0}"', profile.name) : t('Show all equipment')}
          </button>
        </div>
      )}

      <nav className="aura-library-filterbar" aria-label={t('Muscle groups')} data-tour="lib-filters">
        <button type="button" className={'aura-library-chip' + (!bp ? ' is-active' : '')} aria-pressed={!bp} onClick={() => { setBp(''); setShown(40) }}>{t('All')}</button>
        {BODYPARTS.map(part => (
          <button
            type="button"
            key={part}
            className={'aura-library-chip' + (bp === part ? ' is-active' : '')}
            aria-pressed={bp === part}
            onClick={() => { setBp(bp === part ? '' : part); setShown(40) }}
          >{t(part)}</button>
        ))}
        {catOn && <button type="button" className="aura-library-chip is-active" onClick={() => { setCat(''); setShown(40) }}>{t(catOn)} ×</button>}
        {eqOn && <button type="button" className="aura-library-chip is-active" onClick={() => { setEq(''); setShown(40) }}>{t(eqOn)} ×</button>}
      </nav>

      <section className="aura-library-grid" aria-label={t('Exercise list')}>
        <button
          type="button"
          className="aura-library-create"
          data-tour="lib-new"
          onClick={() => customExSheet(null, exercise => exerciseDetailSheet(exercise), q.trim())}
        >
          <span className="aura-library-create-icon"><Icon name="plusCircle" /></span>
          <span><strong>{t('Create your own exercise')}</strong><small>{t('name + body part, and a photo or video if you like')}</small></span>
          <Icon name="plus" />
        </button>

        {exercises.slice(0, shown).map(exerciseCard)}
        {exercises.length === 0 && similar.length === 0 && (
          <div className="aura-library-empty">
            <Icon name="magnifier" />
            <p>{t('No match')}</p>
            {q && <button type="button" className="aura-library-action" onClick={resetSearch}>{t('Clear search')}</button>}
          </div>
        )}
        {similar.length > 0 && (
          <>
            <h2 className="aura-library-empty">{exercises.length ? t('Similar exercises') : t('No exact match. These come close:')}</h2>
            {similar.map(exerciseCard)}
          </>
        )}
      </section>

      {exercises.length > shown && (
        <div className="aura-library-more">
          <button type="button" onClick={() => setShown(count => count + 40)}>{t('Show more')}</button>
        </div>
      )}
    </main>
  )
}

// Reuses the existing filter calculations and sheet lifecycle; the sheet inherits the Aura palette.
function LibraryFilters({ close, cat, eq, filtersFor, onChange }) {
  const [selectedCat, setSelectedCat] = useState(cat)
  const [selectedEq, setSelectedEq] = useState(eq)
  const { catOpts, catOn, eqOpts, eqOn } = filtersFor(selectedCat, selectedEq)
  const update = (nextCat, nextEq) => {
    setSelectedCat(nextCat)
    setSelectedEq(nextEq)
    onChange(nextCat, nextEq)
  }
  return (
    <div className="lib-fsheet">
      <h3>{t('Filters')}</h3>
      {catOpts.length > 1 && <>
        <h4 className="sec">{t('Exercise type')}</h4>
        <div className="chips wrap">
          <button type="button" className={'chip nocap' + (!catOn ? ' on' : '')} aria-pressed={!catOn} onClick={() => update('', selectedEq)}>{t('Any type')}</button>
          {catOpts.map(option => <button type="button" key={option} className={'chip' + (catOn === option ? ' on' : '')} aria-pressed={catOn === option} onClick={() => update(option, selectedEq)}>{t(option)}</button>)}
        </div>
      </>}
      {eqOpts.length > 1 && <>
        <h4 className="sec">{t('Equipment')}</h4>
        <div className="chips wrap">
          <button type="button" className={'chip nocap' + (!eqOn ? ' on' : '')} aria-pressed={!eqOn} onClick={() => update(selectedCat, '')}>{t('Any equipment')}</button>
          {eqOpts.map(option => <button type="button" key={option} className={'chip' + (eqOn === option ? ' on' : '')} aria-pressed={eqOn === option} onClick={() => update(selectedCat, option)}>{t(option)}</button>)}
        </div>
      </>}
      <div style={{ height: 16 }} />
      <Button variant="primary" onClick={close}>{t('Done')}</Button>
      {(catOn || eqOn) && <Button variant="ghost" className="dim" style={{ marginTop: 6 }} onClick={() => update('', '')}>{t('Clear filters')}</Button>}
    </div>
  )
}
