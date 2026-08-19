# Nigerian Origin Selector Data

NSOS uses a static, application-bundled state-to-LGA lookup for its State of Origin and Local Government Area of Origin selectors. It contains no learner data, location coordinates, or network lookup at form-entry time.

The mapping is based on a CSV that enumerates LGAs with an associated state or FCT label and is cross-checked against a separate dataset that documents an object mapping each Nigerian state to its LGAs. The application normalizes the FCT label to NSOS’s existing **Federal Capital Territory** state value.

| Source | Use in NSOS |
| --- | --- |
| [arilwan/Nigeria `LGA.csv`](https://github.com/arilwan/Nigeria/blob/master/LGA.csv) | Source rows of LGA and state labels. |
| [temikeezy/nigeria-geojson-data](https://github.com/temikeezy/nigeria-geojson-data) | Cross-check that the dataset model covers all Nigerian states plus FCT and a state-to-LGA mapping. |

The selector is intentionally client-side and offline-capable. A submitted LGA is accepted only when it belongs to the selected state within this lookup.
