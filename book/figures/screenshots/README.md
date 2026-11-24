# Screenshots

Put the screenshots here as **PNG** files, exactly as captured. They are always shown whole and are never cropped or
modified. The book picks them up automatically by name; until a file exists, the book shows a framed
"Screenshot to be added" placeholder.

| File | Shows | Used in |
|---|---|---|
| `mobile_home.png` | Citizen home screen with the SOS button | Appendix C |
| `mobile_report.png` | Emergency report (category, location, message, guidance) | Chapter 5 |
| `mobile_tracking_and_chat.png` | Live tracking of the response, incident details and chat | Chapter 5 |
| `mobile_mission.png` | A mission offered to an ambulance crew | Appendix C |
| `mobile_handoff.png` | Ambulance handoff on arrival: patient information, destination hospital | Chapter 5 |
| `mobile_handoff2.png` | Ambulance handoff while transporting: vitals entry and latest vitals | Appendix C |
| `mobile_medical.png` | Medical profile with the sharing consent switch | Appendix C |
| `mobile_kyc.png` | Account screen with identity verification | Appendix C |
| `web_dispatch.png` | Dispatcher workspace: live queue, map, unit panel | Chapter 5 |
| `web_hospital.png` | Hospital dashboard: incoming transfers and vitals | Appendix C |
| `web_admin.png` | Administration: users, facilities, units | Appendix C |

## How they are laid out

Phone screens, including full-length scrolling captures, are lined up side by side at the same height
(`\screenshotrow`), so each screen is shown in full. Desktop screenshots are placed one per figure (`\screenshot`).

```latex
\screenshotrow[0.78\textheight]{mobile_report,mobile_tracking_and_chat}{Caption.}{fig:label}
%             ^ image height (default 0.62\textheight)   ^ screens, left to right
```

Use `0.78\textheight` for long (scrolling) screens and the default for ordinary ones. The row must fit the page width:
up to four full-length phone screens fit at `0.78\textheight`; for fewer or shorter screens you can use larger heights.

## Very large screenshots (`print/` folder)

Some TeX installations silently skip images above roughly 4 million pixels, and a full-length phone capture can
have 8 million. The screens are shown only 2-6 cm wide, so `tools/prepare_screenshots.py` (`make images`) writes a
resampled copy of the **whole** screen (nothing is cropped) for each oversized screenshot to `figures/screenshots/print/`.
The book uses the copy when it exists and your original otherwise; your original files are never changed. Run it
again whenever you add or retake a screenshot, and keep the files in `print/` with the project (Overleaf cannot run
scripts). Requires `pip install pillow`.

## Tips

Use the production build with realistic (non-personal) demo data; hide any real e-mail, phone number or token.
Capture phones at their native resolution (about 1080 px wide) and desktop screens at 1920 px wide. A long
capture is sharp when zoomed in the PDF, but its text is small on paper, so keep important detail in the shorter screens.
Run `make placeholders` to see which files are still missing.
