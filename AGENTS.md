<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Bookings are created only via the `create_booking` / `create_manual_booking` database functions; the exclusion constraint on bookings is the source of truth against double booking.
- Booking internal notes live in `booking_internal_notes` so customers can never read them via the bookings table.
- Storage buckets are private (workspace blocks public buckets); uploads return long-lived signed URLs stored on the row.
- Public booking page data loads through the `getPublicBusiness` server function using a publishable-key client.
- Signed-in account state (roles, profile, business) comes from `accountQuery` in src/lib/account.ts.
- All UI strings live in src/lib/copy.ts.
- Booking-flow selection lives in /b/$slug search params so it survives sign-in redirects.
