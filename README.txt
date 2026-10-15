ParkSmart Puducherry  -  PS-03 prototype
Smart Parking, Traffic Enforcement & Citizen Reporting System
Puducherry Police Hackathon 2026 (Puducherry Police x MVIT)
==============================================================

HOW TO RUN (Windows)
  1. Double-click START.bat  (needs Node.js - same as CrimeMap)
  2. The browser opens http://localhost:5053 by itself.
  3. Keep the black window open during the demo.

  This is a SEPARATE app from CrimeMap (PS-02). Both can run at the same time:
  CrimeMap uses port 5050, ParkSmart uses port 5053.

OPEN ON PHONE
  - Click the "Phone" button (top bar) and scan the QR code.
  - Phone and laptop must be on the same Wi-Fi or hotspot.
  - If it does not open: run ALLOW-PHONE-ACCESS.bat once (click Yes).
  - College Wi-Fi often blocks this - use a phone hotspot.

LOGINS (police side)
  admin     / Admin@123    SP Traffic (everything + edit lots + audit log)
  traffic   / Officer@123  Traffic SI (dashboard, reports, CCTV, challans)
  attendant / Lot@123      Parking attendant (gate counter for Goubert Market lot)
  Citizens do NOT log in: Find Parking, Report Violation, Track My Report.

WHAT IT DOES
  Citizens
   - Live map + list of authorised parking with free car / two-wheeler slots
   - "In 1 hour ~X% full" forecast and "Best time today" chart
   - Report a violation: photo + map pin + type + vehicle number, no login
   - Report ID + QR to track status (New -> Verified -> Challan / Rejected)
  Traffic Police
   - Command dashboard: free slots, full lots, open reports, fines, response time
   - Zone congestion index (parking occupancy + recent violations)
   - Recommended actions: where/when to send tow vehicle, patrol, overflow parking
   - One queue for citizen + CCTV + officer reports, auto-priority, duplicate linking
   - Challan with QR + photo evidence fingerprint (SHA-256), mark fine paid
   - Number plate reader (OCR): the vehicle number is read from the photo
     automatically - offline, no internet (Tesseract engine in public\lib\ocr).
     Tap the plate in the photo to read it again. Works in citizen reports,
     officer reports and CCTV (ANPR close-up).
   - CCTV detection: vehicle stopped in no-parking zone > allowed time is
     auto-captured, the plate is read by OCR, and the report is filed
     (simulated video feed for the demo)
   - Repeat offenders, analytics (day x hour heat table, hotspots, channel
     reliability, response time by unit), CSV export, audit log
  Attendants
   - Big + / - buttons on phone; citizens see free slots change instantly
  Field use
   - ParkSmart Mobile Android app: fully offline, camera + GPS, sync file
     back to the laptop (see below)

DEMO STORY (about 5 minutes)
  1. Phone: Find Parking -> pick "Goubert Market" -> see free slots, Best time.
  2. Phone: Report Violation -> photo, pick type, tap map -> get ID + QR.
  3. Laptop (traffic): dashboard pops "New report" -> open queue -> Verify ->
     Issue challan -> Print challan.
  4. Phone: Track My Report -> shows "Challan issued".
  5. Laptop: CCTV Detection -> "Send a car into the zone" -> after the allowed
     time it turns red and files a report by itself.
  6. Laptop: Recommended actions + Analytics heat table + Repeat offenders.
  7. Attendant login on a phone: tap + / -, citizen map updates live.

OTHER FILES
  RUN-SELF-TEST.bat    checks every feature (should say ALL CHECKS PASSED)
  RESET-DEMO-DATA.bat  wipes data and creates fresh demo data on next start
  data\db.json         all data (created on first run)

NOTE
  All data is SIMULATED. Parking locations and no-parking stretches are
  approximate. Fine amounts are illustrative. Works without internet
  (the map switches to an offline backdrop when there is no internet).

PARKSMART MOBILE - the phone app that needs NO laptop and NO Wi-Fi
  mobile\dist\ParkSmart-Mobile.apk is a full Android app (Android 7 or newer).
  The WHOLE system runs inside the phone: find parking, report violation,
  track, police login, violation queue, challans, CCTV demo, lots, repeat
  offenders, analytics and audit log. Same rules engine as the laptop
  (the build uses the laptop's own server.js).
   1. Copy ParkSmart-Mobile.apk to the phone (WhatsApp to yourself, USB, Drive).
   2. Open it -> Install (allow "Install unknown apps"; if Play Protect warns:
      More details -> Install anyway).
   3. Open "ParkSmart Mobile". Same logins as the laptop.
  * Photo: the app offers Camera or Gallery (camera option on Android 10+).
  * "My location" uses the phone GPS (asks permission the first time).
  * With mobile data the map shows real streets; with no internet it switches
    to the offline map and everything still works.
  * Challan "Print" uses Android's print service (Save as PDF works).
  * SYNC TO LAPTOP: phone menu -> Phone & Sync -> Save sync file. Send the file
    to the laptop, then on the laptop: Violation Reports -> Import phone sync.
    Reports already on the laptop are skipped. Photos + SHA-256 go with them.
    Phone report IDs start with M + 2 letters (e.g. MAB01174), so they never
    clash with laptop IDs.
  * iPhone / any browser: open mobile\dist\ParkSmart-Mobile.html (same app, one file).
  * To rebuild after changing the code: node mobile\build-mobile.js
    (the APK is rebuilt from mobile\android with apktool + signing).

ANDROID CONNECT APP (ParkSmart.apk)
  The app opens the LAPTOP's ParkSmart full screen on an Android phone (Android 7
  or newer) and finds the laptop on the Wi-Fi / hotspot automatically.
  Install:
   1. Start the laptop (START.bat) and connect the phone to the same Wi-Fi/hotspot.
   2. Laptop: click "Phone" -> scan the "Android app" QR with the phone
      (or copy ParkSmart.apk to the phone by USB / WhatsApp / Telegram).
   3. Open the downloaded file -> Install. If asked, allow
      "Install unknown apps" for Chrome / Files. If Play Protect warns,
      tap "More details" -> "Install anyway" (it is our own app, not from Play Store).
   4. Open "ParkSmart" from the app drawer. It finds the laptop by itself,
      or type the laptop address shown under the Phone button.
  Back button inside the app goes back a page; from the first page it returns
  to the connect screen.
