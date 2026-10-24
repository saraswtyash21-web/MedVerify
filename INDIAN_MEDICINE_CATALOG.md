# Indian medicine catalogue

Doctor Info searches the HealthPilot.ai Drug Information Service at `https://drugdb.in/`, which identifies its data as Common Drug Codes for India from NRCeS at C-DAC Pune. The UI and server proxy request medicine-name matches only and cap each response at 99 results. No Eka credentials or RapidAPI key are required.

## What the feature does

- Searches Indian branded medicine names and displays the returned product name, generic name, and manufacturer when present.
- Uses a same-origin endpoint (`/api/india-medicine-search`) so the browser does not need cross-origin access to the catalogue.
- Handles upstream errors and timeouts without inserting sample results.
- Shows source attribution in the result page.

## Limits and licensing

This is a catalogue lookup, not a quality-alert, ban, authenticity, interaction, diagnosis, or treatment service. The public NRCeS page describes the Common Drug Codes for India data as available under the package's `License.txt`. That license grants content other than SNOMED CT International Release content under CC BY 4.0, states that brand/trade names belong to their owners, and says the data may not be current, complete, or accurate. The app therefore does not expose SNOMED identifiers or clinical recommendations and includes attribution. Review the current source license and any applicable SNOMED licensing before using the data in a commercial or clinical deployment.

Sources:

- [Drug Information Service search and API notes](https://drugdb.in/)
- [NRCeS Common Drug Codes for India and DISB release information](https://www.nrces.in/services/national-releases)
- [NRCeS DISB license](https://nrces.in/download/files/doc/License.txt)
- [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/)
