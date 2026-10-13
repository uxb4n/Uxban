/* ==============================================
   UXBAN — EVENTS CONFIG
   Edit this file to manage your shows.

   ┌─────────────────────────────────────────────┐
   │ PUBLIC FLAG                                 │
   │                                             │
   │ Set `public: true` when you're ready to     │
   │ announce. Until then, /events/ shows the    │
   │ 404 state to everyone.                      │
   │                                             │
   │ Test with ?preview=1 to see your own page.  │
   └─────────────────────────────────────────────┘

   ── Per-event fields ───────────────────────
   Every field is optional except `date`, `venue`,
   and `city`. Fill in what you know.

   date:         ISO 8601 with NZ offset (+12 for
                 NZST, +13 for NZDT — daylight saving
                 from late Sep to early Apr)
   ticketsStatus: 'onsale' | 'presale' | 'soldout'
                  | 'free'   | 'soon'   | 'tba'
   ============================================== */

window.UXBAN_EVENTS_CONFIG = {

  /* ── Master switch ─────────────────────────
     false = hidden from everyone
     true  = visible at /events/
     Test with ?preview=1 while hidden ── */
  public: false,


  /* ── Upcoming events ────────────────────────
     Anything with a date in the future shows
     as "upcoming". Anything past shows in the
     "past shows" archive automatically. */
  events: [

    {
      id:   'nov-7-2026',
      title: 'Live in Concert',         // shown if there's no poster image

      // ── Date & time ──
      date:      '2026-11-07T20:00:00+13:00',   // show start time
      doorsOpen: '2026-11-07T19:00:00+13:00',   // optional

      // ── Venue ──
      venue:   'The Claddagh',
      city:    'Auckland',
      country: 'New Zealand',
      address: '372 Broadway, Newmarket',                        // full street address (for directions)

      // ── Tickets ──
      ticketsUrl:    '',                  // leave empty until you have it
      ticketsStatus: 'tba',               // 'onsale' | 'presale' | 'soldout' | 'free' | 'soon' | 'tba'

      // ── Optional ──
      ageRestriction: 'R18',                 // 'R18', 'All Ages', etc.
      lineup:         ['Uxban'],          // support acts
      description:    '',                 // short blurb (1–2 sentences)
      posterImage:    '',                 // '/assets/images/events/nov-7-poster.jpg'
      moreInfoUrl:    '',                 // external link (Facebook event, venue page, etc.)
    },

    // ── COPY THIS BLOCK FOR EACH NEW EVENT ──
    // {
    //   id:   'dec-15-2026',
    //   title: 'Festival Set',
    //   date:      '2026-12-15T21:00:00+13:00',
    //   doorsOpen: '2026-12-15T19:30:00+13:00',
    //   venue:   'Festival Grounds',
    //   city:    'Wellington',
    //   country: 'New Zealand',
    //   address: '123 Festival Way, Wellington',
    //   ticketsUrl:    'https://tickets.example.com',
    //   ticketsStatus: 'onsale',
    //   ageRestriction: 'R18',
    //   lineup:  ['Uxban', 'Support Act'],
    //   description: 'A 45-minute headline set.',
    //   posterImage: '/assets/images/events/dec-15-poster.jpg',
    // },

  ],

};