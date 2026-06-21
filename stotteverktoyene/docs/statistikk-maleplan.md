# Statistikk: maleplan for verdi og arbeidsgiver-rapportering

Dette oppsettet er laget for a dokumentere hvor viktig appen er for brukerne, med fokus pa sidebruk, kopiering og tidsbesparelse.

## Event-navn (frontend)

Disse eventene logges i appen:

- `app_open`: App startet
- `page_view`: Bruker gikk inn pa en side
- `menu_click`: Klikk i venstremenyen (navigasjon)
- `standardtekst_open`: Bruker apnet en standardtekst
- `standardtekst_copy`: Bruker kopierte tekst
- `search_standardtekster`: Bruker startet sok i standardtekster

## Side-nokler (UsagePage)

- `home`
- `omeq`
- `standardtekster`
- `interaksjoner`
- `produktskjema`
- `anbrudd`
- `tilbakemelding`
- `profil`
- `rekspert`
- `statistikk`
- `other`

## Firestore-datamodell (daglig aggregert)

Path:

- `usage_daily/{yyyy-mm-dd}/users/{uid}`
- `usage_daily/{yyyy-mm-dd}/totals/all`
- `usage_daily/{yyyy-mm-dd}/standardtekster/{standardtekstId}`
- `usage_daily/{yyyy-mm-dd}/users/{uid}/standardtekster/{standardtekstId}`

Felter pa `users/{uid}` (utvalg):

- `pageViews` (number)
- `copies` (number)
- `searches` (number)
- `standardtekstOpens` (number)
- `menuClicks` (number)
- `pageViewsByPage.{pageKey}` (number)
- `menuClicksByPage.{pageKey}` (number)
- `eventCounts.{eventName}` (number)
- `lastPage`, `lastTargetPage`, `lastStandardtekstId`
- `updatedAt`

## SQL-modell (hvis dere eksporterer til warehouse)

Eksempel pa tabell for event-niva (`analytics_events`):

```sql
create table if not exists analytics_events (
  event_id bigserial primary key,
  event_ts timestamptz not null,
  event_date date not null,
  user_id text not null,
  event_name text not null,
  page text null,
  target_page text null,
  standardtekst_id text null,
  search_len int null,
  source_app text not null default 'reks-stotteverktoy'
);
```

## Nokkeltall for arbeidsgiver

```sql
-- 1) Aktive brukere i periode
select count(distinct user_id) as aktive_brukere
from analytics_events
where event_date between :from_date and :to_date;

-- 2) Sidevisninger per side
select
  coalesce(page, 'other') as side,
  count(*) as visninger,
  count(distinct user_id) as unike_brukere
from analytics_events
where event_name = 'page_view'
  and event_date between :from_date and :to_date
group by 1
order by visninger desc;

-- 3) Konvertering sok -> kopi
with s as (
  select count(*)::numeric as searches
  from analytics_events
  where event_name = 'search_standardtekster'
    and event_date between :from_date and :to_date
), c as (
  select count(*)::numeric as copies
  from analytics_events
  where event_name = 'standardtekst_copy'
    and event_date between :from_date and :to_date
)
select
  c.copies,
  s.searches,
  case when s.searches = 0 then 0 else round((c.copies / s.searches) * 100, 1) end as copy_rate_pct
from c, s;

-- 4) Estimert tidsbesparelse (45 sek per kopi)
select
  count(*) as copies,
  round((count(*) * 45.0) / 3600.0, 1) as estimerte_timer_spart
from analytics_events
where event_name = 'standardtekst_copy'
  and event_date between :from_date and :to_date;

-- 5) Topp brukerflyt (forenklet: sidevisning -> sidevisning)
with pv as (
  select
    user_id,
    event_ts,
    coalesce(page, 'other') as page,
    lead(coalesce(page, 'other')) over (partition by user_id order by event_ts) as next_page
  from analytics_events
  where event_name = 'page_view'
    and event_date between :from_date and :to_date
)
select
  page,
  next_page,
  count(*) as transitions
from pv
where next_page is not null
group by 1,2
order by transitions desc
limit 20;
```

## Mal for manedsrapport

- Aktive brukere: `X` (endring vs forrige maned: `Y%`)
- Sidevisninger totalt: `X`
- Mest brukte sider: `...`
- Kopieringer: `X`
- Konvertering sok -> kopi: `X%`
- Estimert tid spart: `X timer`
- Kommentar/tiltak: hva burde forbedres neste maned
