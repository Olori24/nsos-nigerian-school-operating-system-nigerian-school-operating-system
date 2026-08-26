# NSOS Staging Database Provider Assessment — 26 August 2026

## Selected provisional route

The owner signed in to the Aiven console and created the separate provider project **`nsos-staging-db`**. The console is currently on its **Create service** screen, with **MySQL** available as a service type. No database service, connection string, credential, import, storage integration, or NSOS connection has been created in this provider project.

The route was selected because Aiven’s official MySQL page describes a managed MySQL offering and a no-credit-card sign-up path. Its suitability remains conditional on selecting a clearly non-production service, keeping it empty, and verifying its identity before it is placed in the NSOS Staging project’s secure settings.

## Required next boundary

The next action is to select **MySQL** and inspect the resulting service configuration before submission. Do not create the service if the page requires an unexpected payment method, presents a production-labelled target, preloads data, or fails to show an explicit service name and region. A service-creation confirmation is required before the final provider submission.

## Provisioned service — pending connection verification

After the owner’s explicit confirmation, the provider created the MySQL service **`nsos-staging-mysql`** inside the separate **`nsos-staging-db`** provider project. The provider overview identifies it as a **Free-1-1gb** service with one node. Its default database is provider-created and no NSOS data was imported. Connection values, password, certificate contents, and the full service URI were not revealed, copied, or stored in this repository.

The service is a distinct provider resource, but its empty-state and secure NSOS Staging connection are not yet verified. The next step must obtain its database URL only through the NSOS Staging project’s secure secret-setting flow, then validate that project’s marker and fail-closed controls before running any application activity.

## Sources

1. [Aiven free managed MySQL database](https://aiven.io/free-mysql-database)
2. [Aiven console service-creation screen](https://console.aiven.io/account/a5d8369a83b9/project/nsos-staging-db/new-service)
