# REST API

- [Overview](#overview)
- [Authentication](#authentication)
- [Hosts](#hosts)
- [Labels](#labels)
- [Users](#users)
- [Sessions](#sessions)
- [Queries](#queries)
- [Schedule](#schedule)
- [Packs](#packs)
- [Policies](#policies)
- [Activities](#activities)
- [Targets](#targets)
- [Fleet configuration](#fleet-configuration)
- [File carving](#file-carving)
- [Teams](#teams)
- [Translator](#translator)
- [Software](#software)

## Overview

Fleet is powered by a Go API server which serves three types of endpoints:

- Endpoints starting with `/api/v1/osquery/` are osquery TLS server API endpoints. All of these endpoints are used for talking to osqueryd agents and that's it.
- Endpoints starting with `/api/v1/fleet/` are endpoints to interact with the Fleet data model (packs, queries, scheduled queries, labels, hosts, etc) as well as application endpoints (configuring settings, logging in, session management, etc).
- All other endpoints are served by the React single page application bundle.
  The React app uses React Router to determine whether or not the URI is a valid
  route and what to do.

### fleetctl

Many of the operations that a user may wish to perform with an API are currently best performed via the [fleetctl](./2-fleetctl-CLI.md) tooling. These CLI tools allow updating of the osquery configuration entities, as well as performing live queries.

### Current API

The general idea with the current API is that there are many entities throughout the Fleet application, such as:

- Queries
- Packs
- Labels
- Hosts

Each set of objects follows a similar REST access pattern.

- You can `GET /api/v1/fleet/packs` to get all packs
- You can `GET /api/v1/fleet/packs/1` to get a specific pack.
- You can `DELETE /api/v1/fleet/packs/1` to delete a specific pack.
- You can `POST /api/v1/fleet/packs` (with a valid body) to create a new pack.
- You can `PATCH /api/v1/fleet/packs/1` (with a valid body) to modify a specific pack.

Queries, packs, scheduled queries, labels, invites, users, sessions all behave this way. Some objects, like invites, have additional HTTP methods for additional functionality. Some objects, such as scheduled queries, are merely a relationship between two other objects (in this case, a query and a pack) with some details attached.

All of these objects are put together and distributed to the appropriate osquery agents at the appropriate time. At this time, the best source of truth for the API is the [HTTP handler file](https://github.com/fleetdm/fleet/blob/main/server/service/handler.go) in the Go application. The REST API is exposed via a transport layer on top of an RPC service which is implemented using a micro-service library called [Go Kit](https://github.com/go-kit/kit). If using the Fleet API is important to you right now, being familiar with Go Kit would definitely be helpful.

> [Check out Fleet v3's REST API documentation](https://github.com/fleetdm/fleet/blob/0bd6903b2df084c9c727f281e86dff0cbc2e0c25/docs/1-Using-Fleet/3-REST-API.md), if you're using a version of Fleet below 4.0.0. Warning: Fleet v3's documentation is no longer being maintained.

## Authentication

- [Log in](#log-in)
- [Log out](#log-out)
- [Forgot password](#forgot-password)
- [Change password](#change-password)
- [Reset password](#reset-password)
- [Me](#me)
- [SSO config](#sso-config)
- [Initiate SSO](#initiate-sso)
- [SSO callback](#sso-callback)

All API requests to the Fleet server require API token authentication unless noted in the documentation. API tokens are tied to your Fleet user account.

To get an API token, retrieve it from the "Account settings" > "Get API token" in the Fleet UI (`/profile`). Or, you can send a request to the [login API endpoint](#log-in) to get your token.

Then, use that API token to authenticate all subsequent API requests by sending it in the "Authorization" request header, prefixed with "Bearer ":

```
Authorization: Bearer <your token>
```

> For SSO users, email/password login is disabled. The API token can instead be retrieved from the "My account" page in the UI (/profile). On this page, choose "Get API token".

### Log in

Authenticates the user with the specified credentials. Use the token returned from this endpoint to authenticate further API requests.

`POST /api/v1/fleet/login`

> This API endpoint is not available to SSO users, since email/password login is disabled for SSO users. To get an API token for an SSO user, you can use the Fleet UI.

#### Parameters

| Name     | Type   | In   | Description                                   |
| -------- | ------ | ---- | --------------------------------------------- |
| email    | string | body | **Required**. The user's email.               |
| password | string | body | **Required**. The user's plain text password. |

#### Example

`POST /api/v1/fleet/login`

##### Request body

```json
{
  "email": "janedoe@example.com",
  "password": "VArCjNW7CfsxGp67"
}
```

##### Default response

`Status: 200`

```json
{
  "user": {
    "created_at": "2020-11-13T22:57:12Z",
    "updated_at": "2020-11-13T22:57:12Z",
    "id": 1,
    "name": "Jane Doe",
    "email": "janedoe@example.com",
    "enabled": true,
    "force_password_reset": false,
    "gravatar_url": "",
    "sso_enabled": false,
    "global_role": "admin",
    "teams": []
  },
  "token": "{your token}"
}
```

---

### Log out

Logs out the authenticated user.

`POST /api/v1/fleet/logout`

#### Example

`POST /api/v1/fleet/logout`

##### Default response

`Status: 200`

---

### Forgot password

Sends a password reset email to the specified email. Requires that SMTP is configured for your Fleet server.

`POST /api/v1/fleet/forgot_password`

#### Parameters

| Name  | Type   | In   | Description                                                             |
| ----- | ------ | ---- | ----------------------------------------------------------------------- |
| email | string | body | **Required**. The email of the user requesting the reset password link. |

#### Example

`POST /api/v1/fleet/forgot_password`

##### Request body

```json
{
  "email": "janedoe@example.com"
}
```

##### Default response

`Status: 200`

##### Unknown error

`Status: 500`

```json
{
  "message": "Unknown Error",
  "errors": [
    {
      "name": "base",
      "reason": "email not configured",
    }
  ]
}
```

---

### Change password

`POST /api/v1/fleet/change_password`

Changes the password for the authenticated user.

#### Parameters

| Name         | Type   | In   | Description                            |
| ------------ | ------ | ---- | -------------------------------------- |
| old_password | string | body | **Required**. The user's old password. |
| new_password | string | body | **Required**. The user's new password. |

#### Example

`POST /api/v1/fleet/change_password`

##### Request body

```json
{
  "old_password": "VArCjNW7CfsxGp67",
  "new_password": "zGq7mCLA6z4PzArC"
}
```

##### Default response

`Status: 200`

##### Validation failed

`Status: 422 Unprocessable entity`

```json
{
  "message": "Validation Failed",
  "errors": [
    {
      "name": "old_password",
      "reason": "old password does not match"
    }
  ]
}
```

### Reset password

Resets a user's password. Which user is determined by the password reset token used. The password reset token can be found in the password reset email sent to the desired user.

`POST /api/v1/fleet/reset_password`

#### Parameters

| Name                      | Type   | In   | Description                                                               |
| ------------------------- | ------ | ---- | ------------------------------------------------------------------------- |
| new_password              | string | body | **Required**. The new password.                                           |
| new_password_confirmation | string | body | **Required**. Confirmation for the new password.                          |
| password_reset_token      | string | body | **Required**. The token provided to the user in the password reset email. |

#### Example

`POST /api/v1/fleet/reset_password`

##### Request body

```json
{
  "new_password": "abc123"
  "new_password_confirmation": "abc123"
  "password_reset_token": "UU5EK0JhcVpsRkY3NTdsaVliMEZDbHJ6TWdhK3oxQ1Q="
}
```

##### Default response

`Status: 200`

```json
{}
```

---

### Me

Retrieves the user data for the authenticated user.

`POST /api/v1/fleet/me`

#### Example

`POST /api/v1/fleet/me`

##### Default response

`Status: 200`

```json
{
  "user": {
    "created_at": "2020-11-13T22:57:12Z",
    "updated_at": "2020-11-16T23:49:41Z",
    "id": 1,
    "name": "Jane Doe",
    "email": "janedoe@example.com",
    "global_role": "admin",
    "enabled": true,
    "force_password_reset": false,
    "gravatar_url": "",
    "sso_enabled": false,
    "teams": []
  }
}
```

---

### Perform required password reset

Resets the password of the authenticated user. Requires that `force_password_reset` is set to `true` prior to the request.

`POST /api/v1/fleet/perform_require_password_reset`

#### Example

`POST /api/v1/fleet/perform_required_password_reset`

##### Request body

```json
{
  "new_password": "sdPz8CV5YhzH47nK"
}
```

##### Default response

`Status: 200`

```json
{
  "user": {
    "created_at": "2020-11-13T22:57:12Z",
    "updated_at": "2020-11-17T00:09:23Z",
    "id": 1,
    "name": "Jane Doe",
    "email": "janedoe@example.com",
    "enabled": true,
    "force_password_reset": false,
    "gravatar_url": "",
    "sso_enabled": false,
    "global_role": "admin",
    "teams": []
  }
}
```

---

### SSO config

Gets the current SSO configuration.

`GET /api/v1/fleet/sso`

#### Example

`GET /api/v1/fleet/sso`

##### Default response

`Status: 200`

```json
{
  "settings": {
    "idp_name": "IDP Vendor 1",
    "idp_image_url": "",
    "sso_enabled": false
  }
}
```

---

### Initiate SSO

`POST /api/v1/fleet/sso`

#### Parameters

| Name      | Type   | In   | Description                                                                 |
| --------- | ------ | ---- | --------------------------------------------------------------------------- |
| relay_url | string | body | **Required**. The relative url to be navigated to after successful sign in. |

#### Example

`POST /api/v1/fleet/sso`

##### Request body

```json
{
  "relay_url": "/hosts/manage"
}
```

##### Default response

`Status: 200`

##### Unknown error

`Status: 500`

```json
{
  "message": "Unknown Error",
  "errors": [
    {
      "name": "base",
      "reason": "InitiateSSO getting metadata: Get \"https://idp.example.org/idp-meta.xml\": dial tcp: lookup idp.example.org on [2001:558:feed::1]:53: no such host"
    }
  ]
}
```

### SSO callback

This is the callback endpoint that the identity provider will use to send security assertions to Fleet. This is where Fleet receives and processes the response from the identify provider.

`POST /api/v1/fleet/sso/callback`

#### Parameters

| Name         | Type   | In   | Description                                                 |
| ------------ | ------ | ---- | ----------------------------------------------------------- |
| SAMLResponse | string | body | **Required**. The SAML response from the identity provider. |

#### Example

`POST /api/v1/fleet/sso/callback`

##### Request body

```json
{
  "SAMLResponse": "<SAML response from IdP>"
}
```

##### Default response

`Status: 200`

```json
{}
```

---

## Hosts

- [List hosts](#list-hosts)
- [Get hosts summary](#get-hosts-summary)
- [Get host](#get-host)
- [Get host by identifier](#get-host-by-identifier)
- [Delete host](#delete-host)
- [Refetch host](#refetch-host)
- [Transfer hosts to a team](#transfer-hosts-to-a-team)
- [Transfer hosts to a team by filter](#transfer-hosts-to-a-team-by-filter)

### List hosts

`GET /api/v1/fleet/hosts`

#### Parameters

| Name                    | Type    | In    | Description                                                                                                                                                                                                                                                                                                                                 |
| ----------------------- | ------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| page                    | integer | query | Page number of the results to fetch.                                                                                                                                                                                                                                                                                                        |
| per_page                | integer | query | Results per page.                                                                                                                                                                                                                                                                                                                           |
| order_key               | string  | query | What to order results by. Can be any column in the hosts table.                                                                                                                                                                                                                                                                             |
| order_direction         | string  | query | **Requires `order_key`**. The direction of the order given the order key. Options include `asc` and `desc`. Default is `asc`.                                                                                                                                                                                                               |
| status                  | string  | query | Indicates the status of the hosts to return. Can either be `new`, `online`, `offline`, or `mia`.                                                                                                                                                                                                                                            |
| query                   | string  | query | Search query keywords. Searchable fields include `hostname`, `machine_serial`, `uuid`, and `ipv4`.                                                                                                                                                                                                                                          |
| additional_info_filters | string  | query | A comma-delimited list of fields to include in each host's additional information object. See [Fleet Configuration Options](../1-Using-Fleet/2-fleetctl-CLI.md#fleet-configuration-options) for an example configuration with hosts' additional information. Use `*` to get all stored fields. |
| team_id                 | integer | query | _Available in Fleet Premium_ Filters the users to only include users in the specified team.                                                                                                                                                                                                                                                 |
| policy_id               | integer | query | The ID of the policy to filter hosts by. `policy_response` must also be specified with `policy_id`.                                                                                                                                                                                                                                         |
| policy_response         | string  | query | Valid options are `passing` or `failing`.  `policy_id` must also be specified with `policy_response`.                                                                                                                                                                                                                                       |

If `additional_info_filters` is not specified, no `additional` information will be returned.

#### Example

`GET /api/v1/fleet/hosts?page=0&per_page=100&order_key=hostname&query=2ce`

##### Request query parameters

```json
{
  "page": 0,
  "per_page": 100,
  "order_key": "hostname",
}
```

##### Default response

`Status: 200`

```json
{
  "hosts": [
    {
      "created_at": "2020-11-05T05:09:44Z",
      "updated_at": "2020-11-05T06:03:39Z",
      "id": 1,
      "detail_updated_at": "2020-11-05T05:09:45Z",
      "label_updated_at": "2020-11-05T05:14:51Z",
      "seen_time": "2020-11-05T06:03:39Z",
      "hostname": "2ceca32fe484",
      "uuid": "392547dc-0000-0000-a87a-d701ff75bc65",
      "platform": "centos",
      "osquery_version": "2.7.0",
      "os_version": "CentOS Linux 7",
      "build": "",
      "platform_like": "rhel fedora",
      "code_name": "",
      "uptime": 8305000000000,
      "memory": 2084032512,
      "cpu_type": "6",
      "cpu_subtype": "142",
      "cpu_brand": "Intel(R) Core(TM) i5-8279U CPU @ 2.40GHz",
      "cpu_physical_cores": 4,
      "cpu_logical_cores": 4,
      "hardware_vendor": "",
      "hardware_model": "",
      "hardware_version": "",
      "hardware_serial": "",
      "computer_name": "2ceca32fe484",
      "primary_ip": "",
      "primary_mac": "",
      "distributed_interval": 10,
      "config_tls_refresh": 10,
      "logger_tls_period": 8,
      "additional": {},
      "status": "offline",
      "display_text": "2ceca32fe484",
      "team_id": null,
      "team_name": null,
      "pack_stats": null,
    },
  ]
}
```

### Get hosts summary

Returns the count of all hosts organized by status. `online_count` includes all hosts currently enrolled in Fleet. `offline_count` includes all hosts that haven't checked into Fleet recently. `mia_count` includes all hosts that haven't been seen by Fleet in more than 30 days. `new_count` includes the hosts that have been enrolled to Fleet in the last 24 hours.

`GET /api/v1/fleet/host_summary`

#### Parameters

None.

#### Example

`GET /api/v1/fleet/host_summary`

##### Default response

`Status: 200`

```json
{
  "online_count": 2267,
  "offline_count": 141,
  "mia_count": 0,
  "new_count": 0
}
```

### Get host

Returns the information of the specified host.

The endpoint returns the host's installed `software` if the software inventory feature flag is turned on. This feature flag is turned off by default. [Check out the feature flag documentation](../2-Deploying/2-Configuration.md#feature-flags) for instructions on how to turn on the software inventory feature.

`GET /api/v1/fleet/hosts/{id}`

#### Parameters

| Name | Type    | In   | Description                  |
| ---- | ------- | ---- | ---------------------------- |
| id   | integer | path | **Required**. The host's id. |

#### Example

`GET /api/v1/fleet/hosts/121`

##### Default response

`Status: 200`

```json
{
  "host": {
    "created_at": "2021-08-19T02:02:22Z",
    "updated_at": "2021-08-19T21:14:58Z",
    "software": [
      {
        "id": 408,
        "name": "osquery",
        "version": "4.5.1",
        "source": "rpm_packages",
        "generated_cpe": "",
        "vulnerabilities": null
      },
      {
        "id": 1146,
        "name": "tar",
        "version": "1.30",
        "source": "rpm_packages",
        "generated_cpe": "",
        "vulnerabilities": null
      }
    ],
    "id": 1,
    "detail_updated_at": "2021-08-19T21:07:53Z",
    "label_updated_at": "2021-08-19T21:07:53Z",
    "last_enrolled_at": "2021-08-19T02:02:22Z",
    "seen_time": "2021-08-19T21:14:58Z",
    "refetch_requested": false,
    "hostname": "23cfc9caacf0",
    "uuid": "309a4b7d-0000-0000-8e7f-26ae0815ede8",
    "platform": "rhel",
    "osquery_version": "4.5.1",
    "os_version": "CentOS Linux 8.3.2011",
    "build": "",
    "platform_like": "rhel",
    "code_name": "",
    "uptime": 210671000000000,
    "memory": 16788398080,
    "cpu_type": "x86_64",
    "cpu_subtype": "158",
    "cpu_brand": "Intel(R) Core(TM) i9-9980HK CPU @ 2.40GHz",
    "cpu_physical_cores": 12,
    "cpu_logical_cores": 12,
    "hardware_vendor": "",
    "hardware_model": "",
    "hardware_version": "",
    "hardware_serial": "",
    "computer_name": "23cfc9caacf0",
    "primary_ip": "172.27.0.6",
    "primary_mac": "02:42:ac:1b:00:06",
    "distributed_interval": 10,
    "config_tls_refresh": 10,
    "logger_tls_period": 10,
    "team_id": null,
    "pack_stats": null,
    "team_name": null,
    "additional": {},
    "gigs_disk_space_available": 46.1,
    "percent_disk_space_available": 73,
    "users": [
      {
        "uid": 0,
        "username": "root",
        "type": "",
        "groupname": "root"
      },
      {
        "uid": 1,
        "username": "bin",
        "type": "",
        "groupname": "bin"
      },
    ],
    "labels": [
      {
        "created_at": "2021-08-19T02:02:17Z",
        "updated_at": "2021-08-19T02:02:17Z",
        "id": 6,
        "name": "All Hosts",
        "description": "All hosts which have enrolled in Fleet",
        "query": "select 1;",
        "platform": "",
        "label_type": "builtin",
        "label_membership_type": "dynamic"
      },
      {
        "created_at": "2021-08-19T02:02:17Z",
        "updated_at": "2021-08-19T02:02:17Z",
        "id": 9,
        "name": "CentOS Linux",
        "description": "All CentOS hosts",
        "query": "select 1 from os_version where platform = 'centos' or name like '%centos%'",
        "platform": "",
        "label_type": "builtin",
        "label_membership_type": "dynamic"
      },
      {
        "created_at": "2021-08-19T02:02:17Z",
        "updated_at": "2021-08-19T02:02:17Z",
        "id": 12,
        "name": "All Linux",
        "description": "All Linux distributions",
        "query": "SELECT 1 FROM osquery_info WHERE build_platform LIKE '%ubuntu%' OR build_distro LIKE '%centos%';",
        "platform": "",
        "label_type": "builtin",
        "label_membership_type": "dynamic"
      }
    ],
    "packs": [],
    "status": "online",
    "display_text": "23cfc9caacf0"
  }
}
```

### Get host by identifier

Returns the information of the host specified using the `uuid`, `osquery_host_id`, `hostname`, or
`node_key` as an identifier

`GET /api/v1/fleet/hosts/identifier/{identifier}`

#### Parameters

| Name       | Type              | In   | Description                                                                   |
| ---------- | ----------------- | ---- | ----------------------------------------------------------------------------- |
| identifier | integer or string | path | **Required**. The host's `uuid`, `osquery_host_id`, `hostname`, or `node_key` |

#### Example

`GET /api/v1/fleet/hosts/identifier/392547dc-0000-0000-a87a-d701ff75bc65`

##### Default response

`Status: 200`

```json
{
  "host": {
    "created_at": "2020-11-05T05:09:44Z",
    "updated_at": "2020-11-05T06:03:39Z",
    "id": 1,
    "detail_updated_at": "2020-11-05T05:09:45Z",
    "label_updated_at": "2020-11-05T05:14:51Z",
    "seen_time": "2020-11-05T06:03:39Z",
    "hostname": "2ceca32fe484",
    "uuid": "392547dc-0000-0000-a87a-d701ff75bc65",
    "platform": "centos",
    "osquery_version": "2.7.0",
    "os_version": "CentOS Linux 7",
    "build": "",
    "platform_like": "rhel fedora",
    "code_name": "",
    "uptime": 8305000000000,
    "memory": 2084032512,
    "cpu_type": "6",
    "cpu_subtype": "142",
    "cpu_brand": "Intel(R) Core(TM) i5-8279U CPU @ 2.40GHz",
    "cpu_physical_cores": 4,
    "cpu_logical_cores": 4,
    "hardware_vendor": "",
    "hardware_model": "",
    "hardware_version": "",
    "hardware_serial": "",
    "computer_name": "2ceca32fe484",
    "primary_ip": "",
    "primary_mac": "",
    "distributed_interval": 10,
    "config_tls_refresh": 10,
    "logger_tls_period": 8,
    "additional": {},
    "status": "offline",
    "display_text": "2ceca32fe484",
    "team_id": null,
    "team_name": null,
    "gigs_disk_space_available": 45.86,
    "percent_disk_space_available": 73,
    "pack_stats": null,
  }
}
```

### Delete host

Deletes the specified host from Fleet. Note that a deleted host will fail authentication with the previous node key, and in most osquery configurations will attempt to re-enroll automatically. If the host still has a valid enroll secret, it will re-enroll successfully.

`DELETE /api/v1/fleet/hosts/{id}`

#### Parameters

| Name | Type    | In   | Description                  |
| ---- | ------- | ---- | ---------------------------- |
| id   | integer | path | **Required**. The host's id. |

#### Example

`DELETE /api/v1/fleet/hosts/121`

##### Default response

`Status: 200`

```json
{}
```

### Refetch host

Flags the host details to be refetched the next time the host checks in for live queries. Note that we cannot be certain when the host will actually check in and update these details. Further requests to the host APIs will indicate that the refetch has been requested through the `refetch_requested` field on the host object.

`POST /api/v1/fleet/hosts/{id}/refetch`

#### Parameters

| Name | Type    | In   | Description                  |
| ---- | ------- | ---- | ---------------------------- |
| id   | integer | path | **Required**. The host's id. |

#### Example

`POST /api/v1/fleet/hosts/121/refetch`

##### Default response

`Status: 200`

```json
{}
```

### Transfer hosts to a team

_Available in Fleet Premium_

`POST /api/v1/fleet/hosts/transfer`

#### Parameters

| Name    | Type    | In   | Description                                                             |
| ------- | ------- | ---- | ----------------------------------------------------------------------- |
| team_id | integer | body | **Required**. The ID of the team you'd like to transfer the host(s) to. |
| hosts   | array   | body | **Required**. A list of host IDs.                                       |

#### Example

`POST /api/v1/fleet/hosts/transfer`

##### Request body

```json
{
  "team_id": 1,
  "hosts": [3, 2, 4, 6, 1, 5, 7]
}
```

##### Default response

`Status: 200`

```json
{}
```

### Transfer hosts to a team by filter

_Available in Fleet Premium_

`POST /api/v1/fleet/hosts/transfer/filter`

#### Parameters

| Name    | Type    | In   | Description                                                                                                                                                                                                                                                                                                                        |
| ------- | ------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| team_id | integer | body | **Required**. The ID of the team you'd like to transfer the host(s) to.                                                                                                                                                                                                                                                            |
| filters | object  | body | **Required** Contains any of the following three properties: `query` for search query keywords. Searchable fields include `hostname`, `machine_serial`, `uuid`, and `ipv4`. `status` to indicate the status of the hosts to return. Can either be `new`, `online`, `offline`, or `mia`. `label_id` to indicate the selected label. |

#### Example

`POST /api/v1/fleet/hosts/transfer/filter`

##### Request body

```json
{
  "team_id": 1,
  "filters": {
    "status": "online"
  }
}
```

##### Default response

`Status: 200`

```json
{}
```

---

## Labels

- [Create label](#create-label)
- [Modify label](#modify-label)
- [Get label](#get-label)
- [List labels](#list-labels)
- [List hosts in a label](#list-hosts-in-a-label)
- [Delete label](#delete-label)
- [Delete label by ID](#delete-label-by-id)
- [Apply labels specs](#apply-labels-specs)
- [Get labels specs](#get-labels-specs)
- [Get label spec](#get-label-spec)

### Create label

Creates a dynamic label.

`POST /api/v1/fleet/labels`

#### Parameters

| Name        | Type   | In   | Description                                                                                                                                                                                                                                  |
| ----------- | ------ | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| name        | string | body | **Required**. The label's name.                                                                                                                                                                                                              |
| description | string | body | The label's description.                                                                                                                                                                                                                     |
| query       | string | body | **Required**. The query in SQL syntax used to filter the hosts.                                                                                                                                                                              |
| platform    | string | body | The specific platform for the label to target. Provides an additional filter. Choices for platform are `darwin`, `windows`, `ubuntu`, and `centos`. All platforms are included by default and this option is represented by an empty string. |

#### Example

`POST /api/v1/fleet/labels`

##### Request body

```json
{
  "name": "Ubuntu hosts",
  "description": "Filters ubuntu hosts",
  "query": "select 1 from os_version where platform = 'ubuntu';",
  "platform": ""
}
```

##### Default response

`Status: 200`

```json
{
  "label": {
    "created_at": "0001-01-01T00:00:00Z",
    "updated_at": "0001-01-01T00:00:00Z",
    "id": 1,
    "name": "Ubuntu hosts",
    "description": "Filters ubuntu hosts",
    "query": "select 1 from os_version where platform = 'ubuntu';",
    "label_type": "regular",
    "label_membership_type": "dynamic",
    "display_text": "Ubuntu hosts",
    "count": 0,
    "host_ids": null
  }
}
```

### Modify label

Modifies the specified label. Note: Label queries and platforms are immutable. To change these, you must delete the label and create a new label.

`PATCH /api/v1/fleet/labels/{id}`

#### Parameters

| Name        | Type    | In   | Description                   |
| ----------- | ------- | ---- | ----------------------------- |
| id          | integer | path | **Required**. The label's id. |
| name        | string  | body | The label's name.             |
| description | string  | body | The label's description.      |

#### Example

`PATCH /api/v1/fleet/labels/1`

##### Request body

```json
{
  "name": "macOS label",
  "description": "Now this label only includes macOS machines",
  "platform": "darwin"
}
```

##### Default response

`Status: 200`

```json
{
  "label": {
    "created_at": "0001-01-01T00:00:00Z",
    "updated_at": "0001-01-01T00:00:00Z",
    "id": 1,
    "name": "Ubuntu hosts",
    "description": "Filters ubuntu hosts",
    "query": "select 1 from os_version where platform = 'ubuntu';",
    "platform": "darwin",
    "label_type": "regular",
    "label_membership_type": "dynamic",
    "display_text": "Ubuntu hosts",
    "count": 0,
    "host_ids": null
  }
}
```

### Get label

Returns the specified label.

`GET /api/v1/fleet/labels/{id}`

#### Parameters

| Name | Type    | In   | Description                   |
| ---- | ------- | ---- | ----------------------------- |
| id   | integer | path | **Required**. The label's id. |

#### Example

`GET /api/v1/fleet/labels/1`

##### Default response

`Status: 200`

```json
{
  "label": {
    "created_at": "2021-02-09T22:09:43Z",
    "updated_at": "2021-02-09T22:15:58Z",
    "id": 12,
    "name": "Ubuntu",
    "description": "Filters ubuntu hosts",
    "query": "select 1 from os_version where platform = 'ubuntu';",
    "label_type": "regular",
    "label_membership_type": "dynamic",
    "display_text": "Ubuntu",
    "count": 0,
    "host_ids": null
  }
}
```

### List labels

Returns a list of all the labels in Fleet.

`GET /api/v1/fleet/labels`

#### Parameters

| Name            | Type    | In    | Description                                                                                                                   |
| --------------- | ------- | ----- | ----------------------------------------------------------------------------------------------------------------------------- |
| id              | integer | path  | **Required**. The label's id.                                                                                                 |
| order_key       | string  | query | What to order results by. Can be any column in the labels table.                                                              |
| order_direction | string  | query | **Requires `order_key`**. The direction of the order given the order key. Options include `asc` and `desc`. Default is `asc`. |

#### Example

`GET /api/v1/fleet/labels`

##### Default response

`Status: 200`

```json
{
  "labels": [
    {
      "created_at": "2021-02-02T23:55:25Z",
      "updated_at": "2021-02-02T23:55:25Z",
      "id": 6,
      "name": "All Hosts",
      "description": "All hosts which have enrolled in Fleet",
      "query": "select 1;",
      "label_type": "builtin",
      "label_membership_type": "dynamic",
      "host_count": 7,
      "display_text": "All Hosts",
      "count": 7,
      "host_ids": null
    },
    {
      "created_at": "2021-02-02T23:55:25Z",
      "updated_at": "2021-02-02T23:55:25Z",
      "id": 7,
      "name": "macOS",
      "description": "All macOS hosts",
      "query": "select 1 from os_version where platform = 'darwin';",
      "platform": "darwin",
      "label_type": "builtin",
      "label_membership_type": "dynamic",
      "host_count": 1,
      "display_text": "macOS",
      "count": 1,
      "host_ids": null
    },
    {
      "created_at": "2021-02-02T23:55:25Z",
      "updated_at": "2021-02-02T23:55:25Z",
      "id": 8,
      "name": "Ubuntu Linux",
      "description": "All Ubuntu hosts",
      "query": "select 1 from os_version where platform = 'ubuntu';",
      "platform": "ubuntu",
      "label_type": "builtin",
      "label_membership_type": "dynamic",
      "host_count": 3,
      "display_text": "Ubuntu Linux",
      "count": 3,
      "host_ids": null
    },
    {
      "created_at": "2021-02-02T23:55:25Z",
      "updated_at": "2021-02-02T23:55:25Z",
      "id": 9,
      "name": "CentOS Linux",
      "description": "All CentOS hosts",
      "query": "select 1 from os_version where platform = 'centos' or name like '%centos%'",
      "label_type": "builtin",
      "label_membership_type": "dynamic",
      "host_count": 3,
      "display_text": "CentOS Linux",
      "count": 3,
      "host_ids": null
    },
    {
      "created_at": "2021-02-02T23:55:25Z",
      "updated_at": "2021-02-02T23:55:25Z",
      "id": 10,
      "name": "MS Windows",
      "description": "All Windows hosts",
      "query": "select 1 from os_version where platform = 'windows';",
      "platform": "windows",
      "label_type": "builtin",
      "label_membership_type": "dynamic",
      "display_text": "MS Windows",
      "count": 0,
      "host_ids": null
    },
  ]
}
```

### List hosts in a label

Returns a list of the hosts that belong to the specified label.

`GET /api/v1/fleet/labels/{id}/hosts`

#### Parameters

| Name            | Type    | In    | Description                                                                                                                   |
| --------------- | ------- | ----- | ----------------------------------------------------------------------------------------------------------------------------- |
| id              | integer | path  | **Required**. The label's id.                                                                                                 |
| order_key       | string  | query | What to order results by. Can be any column in the hosts table.                                                               |
| order_direction | string  | query | **Requires `order_key`**. The direction of the order given the order key. Options include `asc` and `desc`. Default is `asc`. |
| status          | string  | query | Indicates the status of the hosts to return. Can either be `new`, `online`, `offline`, or `mia`.                              |
| query           | string  | query | Search query keywords. Searchable fields include `hostname`, `machine_serial`, `uuid`, and `ipv4`.                            |
| team_id         | integer | query | _Available in Fleet Premium_ Filters the users to only include users in the specified team.                                   |

#### Example

`GET /api/v1/fleet/labels/6/hosts&query=floobar`

##### Default response

`Status: 200`

```json
{
  "hosts": [
    {
      "created_at": "2021-02-03T16:11:43Z",
      "updated_at": "2021-02-03T21:58:19Z",
      "id": 2,
      "detail_updated_at": "2021-02-03T21:58:10Z",
      "label_updated_at": "2021-02-03T21:58:10Z",
      "last_enrolled_at": "2021-02-03T16:11:43Z",
      "seen_time": "2021-02-03T21:58:20Z",
      "refetch_requested": false,
      "hostname": "floobar42",
      "uuid": "a2064cef-0000-0000-afb9-283e3c1d487e",
      "platform": "ubuntu",
      "osquery_version": "4.5.1",
      "os_version": "Ubuntu 20.4.0",
      "build": "",
      "platform_like": "debian",
      "code_name": "",
      "uptime": 32688000000000,
      "memory": 2086899712,
      "cpu_type": "x86_64",
      "cpu_subtype": "142",
      "cpu_brand": "Intel(R) Core(TM) i5-8279U CPU @ 2.40GHz",
      "cpu_physical_cores": 4,
      "cpu_logical_cores": 4,
      "hardware_vendor": "",
      "hardware_model": "",
      "hardware_version": "",
      "hardware_serial": "",
      "computer_name": "e2e7f8d8983d",
      "primary_ip": "172.20.0.2",
      "primary_mac": "02:42:ac:14:00:02",
      "distributed_interval": 10,
      "config_tls_refresh": 10,
      "logger_tls_period": 10,
      "team_id": null,
      "pack_stats": null,
      "team_name": null,
      "status": "offline",
      "display_text": "e2e7f8d8983d"
    },
  ]
}
```

### Delete label

Deletes the label specified by name.

`DELETE /api/v1/fleet/labels/{name}`

#### Parameters

| Name | Type   | In   | Description                     |
| ---- | ------ | ---- | ------------------------------- |
| name | string | path | **Required**. The label's name. |

#### Example

`DELETE /api/v1/fleet/labels/ubuntu_label`

##### Default response

`Status: 200`

```json
{}
```

### Delete label by ID

Deletes the label specified by ID.

`DELETE /api/v1/fleet/labels/id/{id}`

#### Parameters

| Name | Type    | In   | Description                   |
| ---- | ------- | ---- | ----------------------------- |
| id   | integer | path | **Required**. The label's id. |

#### Example

`DELETE /api/v1/fleet/labels/id/13`

##### Default response

`Status: 200`

```json
{}
```

### Apply labels specs

Applies the supplied labels specs to Fleet. Each label requires the `name`, and `label_membership_type` properties.

If the `label_membership_type` is set to `dynamic`, the `query` property must also be specified with the value set to a query in SQL syntax.

If the `label_membership_type` is set to `manual`, the `hosts` property must also be specified with the value set to a list of hostnames.

`POST /api/v1/fleet/spec/labels`

#### Parameters

| Name  | Type | In   | Description                                                                                                   |
| ----- | ---- | ---- | ------------------------------------------------------------------------------------------------------------- |
| specs | list | path | A list of the label to apply. Each label requires the `name`, `query`, and `label_membership_type` properties |

#### Example

`POST /api/v1/fleet/spec/labels`

##### Request body

```json
{
  "specs": [
    {
      "name": "Ubuntu",
      "description": "Filters ubuntu hosts",
      "query": "select 1 from os_version where platform = 'ubuntu';",
      "label_membership_type": "dynamic"
    },
    {
      "name": "local_machine",
      "description": "Includes only my local machine",
      "label_membership_type": "manual",
      "hosts": [
        "snacbook-pro.local"
      ]
    }
  ]
}
```

##### Default response

`Status: 200`

```json
{}
```

### Get labels specs

`GET /api/v1/fleet/spec/labels`

#### Parameters

None.

#### Example

`GET /api/v1/fleet/spec/labels`

##### Default response

`Status: 200`

```json
{
  "specs": [
    {
      "id": 6,
      "name": "All Hosts",
      "description": "All hosts which have enrolled in Fleet",
      "query": "select 1;",
      "label_type": "builtin",
      "label_membership_type": "dynamic"
    },
    {
      "id": 7,
      "name": "macOS",
      "description": "All macOS hosts",
      "query": "select 1 from os_version where platform = 'darwin';",
      "platform": "darwin",
      "label_type": "builtin",
      "label_membership_type": "dynamic"
    },
    {
      "id": 8,
      "name": "Ubuntu Linux",
      "description": "All Ubuntu hosts",
      "query": "select 1 from os_version where platform = 'ubuntu';",
      "platform": "ubuntu",
      "label_type": "builtin",
      "label_membership_type": "dynamic"
    },
    {
      "id": 9,
      "name": "CentOS Linux",
      "description": "All CentOS hosts",
      "query": "select 1 from os_version where platform = 'centos' or name like '%centos%'",
      "label_type": "builtin",
      "label_membership_type": "dynamic"
    },
    {
      "id": 10,
      "name": "MS Windows",
      "description": "All Windows hosts",
      "query": "select 1 from os_version where platform = 'windows';",
      "platform": "windows",
      "label_type": "builtin",
      "label_membership_type": "dynamic"
    },
    {
      "id": 11,
      "name": "Ubuntu",
      "description": "Filters ubuntu hosts",
      "query": "select 1 from os_version where platform = 'ubuntu';",
      "label_membership_type": "dynamic"
    }
  ]
}
```

### Get label spec

Returns the spec for the label specified by name.

`GET /api/v1/fleet/spec/labels/{name}`

#### Parameters

None.

#### Example

`GET /api/v1/fleet/spec/labels/local_machine`

##### Default response

`Status: 200`

```json
{
  "specs": {
    "id": 12,
    "name": "local_machine",
    "description": "Includes only my local machine",
    "query": "",
    "label_membership_type": "manual",
  }
}
```

---

## Users

- [List all users](#list-all-users)
- [Create a user account with an invitation](#create-a-user-account-with-an-invitation)
- [Create a user account without an invitation](#create-a-user-account-without-an-invitation)
- [Get user information](#get-user-information)
- [Modify user](#modify-user)
- [Delete user](#delete-user)
- [Promote or demote user](#promote-or-demote-user)
- [Require password reset](#require-password-reset)
- [List a user's sessions](#list-a-users-sessions)
- [Delete a user's sessions](#delete-a-users-sessions)

The Fleet server exposes a handful of API endpoints that handles common user management operations. All the following endpoints require prior authentication meaning you must first log in successfully before calling any of the endpoints documented below.

### List all users

Returns a list of all enabled users

`GET /api/v1/fleet/users`

#### Parameters

| Name            | Type    | In    | Description                                                                                                                   |
| --------------- | ------- | ----- | ----------------------------------------------------------------------------------------------------------------------------- |
| query           | string  | query | Search query keywords. Searchable fields include `name` and `email`.                                                          |
| order_key       | string  | query | What to order results by. Can be any column in the users table.                                                               |
| order_direction | string  | query | **Requires `order_key`**. The direction of the order given the order key. Options include `asc` and `desc`. Default is `asc`. |
| page            | integer | query | Page number of the results to fetch.                                                                                          |
| query           | string  | query | Search query keywords. Searchable fields include `name` and `email`.                                                          |
| per_page        | integer | query | Results per page.                                                                                                             |
| team_id         | string  | query | _Available in Fleet Premium_ Filters the users to only include users in the specified team.                                   |

#### Example

`GET /api/v1/fleet/users`

##### Request query parameters

None.

##### Default response

`Status: 200`

```json
{
  "users": [
    {
      "created_at": "2020-12-10T03:52:53Z",
      "updated_at": "2020-12-10T03:52:53Z",
      "id": 1,
      "name": "Jane Doe",
      "email": "janedoe@example.com",
      "force_password_reset": false,
      "gravatar_url": "",
      "sso_enabled": false,
      "global_role": null,
      "api_only": false,
      "teams": [
        {
          "id": 1,
          "created_at": "0001-01-01T00:00:00Z",
          "name": "workstations",
          "description": "",
          "role": "admin"
        }
      ]
    }
  ]
}
```

##### Failed authentication

`Status: 401 Authentication Failed`

```json
{
  "message": "Authentication Failed",
  "errors": [
    {
      "name": "base",
      "reason": "Authentication failed"
    }
  ]
}
```

### Create a user account with an invitation

Creates a user account after an invited user provides registration information and submits the form.

`POST /api/v1/fleet/users`

#### Parameters

| Name                  | Type   | In   | Description                                                                                                                                                                                                                                                                                                                                              |
| --------------------- | ------ | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| email                 | string | body | **Required**. The email address of the user.                                                                                                                                                                                                                                                                                                             |
| invite_token          | string | body | **Required**. Token provided to the user in the invitation email.                                                                                                                                                                                                                                                                                        |
| name                  | string | body | **Required**. The name of the user.                                                                                                                                                                                                                                                                                                                      |
| password              | string | body | The password chosen by the user (if not SSO user).                                                                                                                                                                                                                                                                                                       |
| password_confirmation | string | body | Confirmation of the password chosen by the user.                                                                                                                                                                                                                                                                                                         |
| global_role           | string | body | The role assigned to the user. In Fleet 4.0.0, 3 user roles were introduced (`admin`, `maintainer`, and `observer`). If `global_role` is specified, `teams` cannot be specified.                                                                                                                                                                         |
| teams                 | array  | body | _Available in Fleet Premium_ The teams and respective roles assigned to the user. Should contain an array of objects in which each object includes the team's `id` and the user's `role` on each team. In Fleet 4.0.0, 3 user roles were introduced (`admin`, `maintainer`, and `observer`). If `teams` is specified, `global_role` cannot be specified. |

#### Example

`POST /api/v1/fleet/users`

##### Request query parameters

```json
{
  "email": "janedoe@example.com",
  "invite_token": "SjdReDNuZW5jd3dCbTJtQTQ5WjJTc2txWWlEcGpiM3c=",
  "name": "janedoe",
  "password": "test-123",
  "password_confirmation": "test-123",
  "teams": [
    {
      "id": 2,
      "role": "observer"
    },
    {
      "id": 4,
      "role": "observer"
    }
  ]
}
```

##### Default response

`Status: 200`

```json
{
  "user": {
    "created_at": "0001-01-01T00:00:00Z",
    "updated_at": "0001-01-01T00:00:00Z",
    "id": 2,
    "name": "janedoe",
    "email": "janedoe@example.com",
    "enabled": true,
    "force_password_reset": false,
    "gravatar_url": "",
    "sso_enabled": false,
    "global_role": "admin",
    "teams": []
  }
}
```

##### Failed authentication

`Status: 401 Authentication Failed`

```json
{
  "message": "Authentication Failed",
  "errors": [
    {
      "name": "base",
      "reason": "Authentication failed"
    }
  ]
}
```

##### Expired or used invite code

`Status: 404 Resource Not Found`

```json
{
  "message": "Resource Not Found",
  "errors": [
    {
      "name": "base",
      "reason": "Invite with token SjdReDNuZW5jd3dCbTJtQTQ5WjJTc2txWWlEcGpiM3c= was not found in the datastore"
    }
  ]
}
```

##### Validation failed

`Status: 422 Validation Failed`

The same error will be returned whenever one of the required parameters fails the validation.

```json
{
  "message": "Validation Failed",
  "errors": [
    {
      "name": "name",
      "reason": "cannot be empty"
    }
  ]
}
```

### Create a user account without an invitation

Creates a user account without requiring an invitation, the user is enabled immediately.

`POST /api/v1/fleet/users/admin`

#### Parameters

| Name        | Type    | In   | Description                                                                                                                                                                                                                                                                                                                                              |
| ----------- | ------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| email       | string  | body | **Required**. The user's email address.                                                                                                                                                                                                                                                                                                                  |
| name        | string  | body | **Required**. The user's full name or nickname.                                                                                                                                                                                                                                                                                                          |
| password    | string  | body | The user's password (required for non-SSO users).                                                                                                                                                                                                                                                                                                        |
| sso_enabled | boolean | body | Whether or not SSO is enabled for the user.                                                                                                                                                                                                                                                                                                              |
| api_only    | boolean | body | User is an "API-only" user (cannot use web UI) if true.                                                                                                                                                                                                                                                                                                  |
| global_role | string  | body | The role assigned to the user. In Fleet 4.0.0, 3 user roles were introduced (`admin`, `maintainer`, and `observer`). If `global_role` is specified, `teams` cannot be specified.                                                                                                                                                                         |
| teams       | array   | body | _Available in Fleet Premium_ The teams and respective roles assigned to the user. Should contain an array of objects in which each object includes the team's `id` and the user's `role` on each team. In Fleet 4.0.0, 3 user roles were introduced (`admin`, `maintainer`, and `observer`). If `teams` is specified, `global_role` cannot be specified. |

#### Example

`POST /api/v1/fleet/users/admin`

##### Request body

```json
{
  "name": "Jane Doe",
  "email": "janedoe@example.com",
  "password": "test-123",
  "teams": [
    {
      "id": 2,
      "role": "observer"
    },
    {
      "id": 3,
      "role": "maintainer"
    },
  ]
}
```

##### Default response

`Status: 200`

```json
{
  "user": {
    "created_at": "0001-01-01T00:00:00Z",
    "updated_at": "0001-01-01T00:00:00Z",
    "id": 5,
    "name": "Jane Doe",
    "email": "janedoe@example.com",
    "enabled": true,
    "force_password_reset": false,
    "gravatar_url": "",
    "sso_enabled": false,
    "api_only": false,
    "global_role": null,
    "teams": [
      {
        "id": 2,
        "role: "observer"
      },
      {
        "id": 3,
        "role: "maintainer"
      },
    ]
  }
}
```

##### User doesn't exist

`Status: 404 Resource Not Found`

```json
{
  "message": "Resource Not Found",
  "errors": [
    {
      "name": "base",
      "reason": "User with id=1 was not found in the datastore"
    }
  ]
}
```

### Get user information

Returns all information about a specific user.

`GET /api/v1/fleet/users/{id}`

#### Parameters

| Name | Type    | In   | Description                  |
| ---- | ------- | ---- | ---------------------------- |
| id   | integer | path | **Required**. The user's id. |

#### Example

`GET /api/v1/fleet/users/2`

##### Request query parameters

```json
{
  "id": 1
}
```

##### Default response

`Status: 200`

```json
{
  "user": {
    "created_at": "2020-12-10T05:20:25Z",
    "updated_at": "2020-12-10T05:24:27Z",
    "id": 2,
    "name": "Jane Doe",
    "email": "janedoe@example.com",
    "force_password_reset": false,
    "gravatar_url": "",
    "sso_enabled": false,
    "global_role": "admin",
    "api_only": false,
    "teams": []
  }
}
```

##### User doesn't exist

`Status: 404 Resource Not Found`

```json
{
  "message": "Resource Not Found",
  "errors": [
    {
      "name": "base",
      "reason": "User with id=5 was not found in the datastore"
    }
  ]
}
```

### Modify user

`PATCH /api/v1/fleet/users/{id}`

#### Parameters

| Name        | Type    | In   | Description                                                                                                                                                                                                                                                                                                                                              |
| ----------- | ------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id          | integer | path | **Required**. The user's id.                                                                                                                                                                                                                                                                                                                             |
| name        | string  | body | The user's name.                                                                                                                                                                                                                                                                                                                                         |
| position    | string  | body | The user's position.                                                                                                                                                                                                                                                                                                                                     |
| email       | string  | body | The user's email.                                                                                                                                                                                                                                                                                                                                        |
| sso_enabled | boolean | body | Whether or not SSO is enabled for the user.                                                                                                                                                                                                                                                                                                              |
| api_only    | boolean | body | User is an "API-only" user (cannot use web UI) if true.                                                                                                                                                                                                                                                                                                  |
| global_role | string  | body | The role assigned to the user. In Fleet 4.0.0, 3 user roles were introduced (`admin`, `maintainer`, and `observer`). If `global_role` is specified, `teams` cannot be specified.                                                                                                                                                                         |
| teams       | array   | body | _Available in Fleet Premium_ The teams and respective roles assigned to the user. Should contain an array of objects in which each object includes the team's `id` and the user's `role` on each team. In Fleet 4.0.0, 3 user roles were introduced (`admin`, `maintainer`, and `observer`). If `teams` is specified, `global_role` cannot be specified. |

#### Example

`PATCH /api/v1/fleet/users/2`

##### Request body

```json
{
  "name": "Jane Doe",
  "global_role": "admin"
}
```

##### Default response

`Status: 200`

```json
{
  "user": {
    "created_at": "2021-02-03T16:11:06Z",
    "updated_at": "2021-02-03T16:11:06Z",
    "id": 2,
    "name": "Jane Doe",
    "email": "janedoe@example.com",
    "global_role": "admin",
    "force_password_reset": false,
    "gravatar_url": "",
    "sso_enabled": false,
    "api_only": false,
    "teams": []
  }
}
```

#### Example (modify a user's teams)

`PATCH /api/v1/fleet/users/2`

##### Request body

```json
{
  "teams": [
    {
      "id": 1,
      "role: "observer"
    },
    {
      "id": 2
      "role": "maintainer"
    }
  ]
}
```

##### Default response

`Status: 200`

```json
{
  "user": {
    "created_at": "2021-02-03T16:11:06Z",
    "updated_at": "2021-02-03T16:11:06Z",
    "id": 2,
    "name": "Jane Doe",
    "email": "janedoe@example.com",
    "enabled": true,
    "force_password_reset": false,
    "gravatar_url": "",
    "sso_enabled": false,
    "global_role": "admin"
    "teams": [
      {
        "id": 2,
        "role: "observer"
      },
      {
        "id": 3,
        "role: "maintainer"
      },
    ]
  }
}
```

### Delete user

Delete the specified user from Fleet.

`DELETE /api/v1/fleet/users/{id}`

#### Parameters

| Name | Type    | In   | Description                  |
| ---- | ------- | ---- | ---------------------------- |
| id   | integer | path | **Required**. The user's id. |

#### Example

`DELETE /api/v1/fleet/users/3`

##### Default response

`Status: 200`

```json
{}
```

### Require password reset

The selected user is logged out of Fleet and required to reset their password during the next attempt to log in. This also revokes all active Fleet API tokens for this user. Returns the user object.

`POST /api/v1/fleet/users/{id}/require_password_reset`

#### Parameters

| Name  | Type    | In   | Description                                                                                    |
| ----- | ------- | ---- | ---------------------------------------------------------------------------------------------- |
| id    | integer | path | **Required**. The user's id.                                                                   |
| reset | boolean | body | Whether or not the user is required to reset their password during the next attempt to log in. |

#### Example

`POST /api/v1/fleet/users/{id}/require_password_reset`

##### Request body

```json
{
  "require": true
}
```

##### Default response

`Status: 200`

```json
{
  "user": {
    "created_at": "2021-02-23T22:23:34Z",
    "updated_at": "2021-02-23T22:28:52Z",
    "id": 2,
    "name": "Jane Doe",
    "email": "janedoe@example.com",
    "force_password_reset": true,
    "gravatar_url": "",
    "sso_enabled": false,
    "global_role": "observer",
    "teams": []
  }
}
```

### List a user's sessions

Returns a list of the user's sessions in Fleet.

`GET /api/v1/fleet/users/{id}/sessions`

#### Parameters

None.

#### Example

`GET /api/v1/fleet/users/1/sessions`

##### Default response

`Status: 200`

```json
{
  "sessions": [
    {
      "session_id": 2,
      "user_id": 1,
      "created_at": "2021-02-03T16:12:50Z"
    },
    {
      "session_id": 3,
      "user_id": 1,
      "created_at": "2021-02-09T23:40:23Z"
    },
    {
      "session_id": 6,
      "user_id": 1,
      "created_at": "2021-02-23T22:23:58Z"
    }
  ]
}
```

### Delete a user's sessions

Deletes the selected user's sessions in Fleet. Also deletes the user's API token.

`DELETE /api/v1/fleet/users/{id}/sessions`

#### Parameters

| Name | Type    | In   | Description                               |
| ---- | ------- | ---- | ----------------------------------------- |
| id   | integer | path | **Required**. The ID of the desired user. |

#### Example

`DELETE /api/v1/fleet/users/1/sessions`

##### Default response

`Status: 200`

```json
{}
```

---

## Sessions

- [Get session info](#get-session-info)
- [Delete session](#delete-session)

### Get session info

Returns the session information for the session specified by ID.

`GET /api/v1/fleet/sessions/{id}`

#### Parameters

| Name | Type    | In   | Description                                  |
| ---- | ------- | ---- | -------------------------------------------- |
| id   | integer | path | **Required**. The ID of the desired session. |

#### Example

`GET /api/v1/fleet/sessions/1`

##### Default response

`Status: 200`

```json
{
  "session_id": 1,
  "user_id": 1,
  "created_at": "2021-03-02T18:41:34Z"
}
```

### Delete session

Deletes the session specified by ID. When the user associated with the session next attempts to access Fleet, they will be asked to log in.

`DELETE /api/v1/fleet/sessions/{id}`

#### Parameters

| Name | Type    | In   | Description                                  |
| ---- | ------- | ---- | -------------------------------------------- |
| id   | integer | path | **Required**. The id of the desired session. |

#### Example

`DELETE /api/v1/fleet/sessions/1`

##### Default response

`Status: 200`

```json
{}
```

---

## Queries

- [Get query](#get-query)
- [List queries](#list-queries)
- [Create query](#create-query)
- [Modify query](#modify-query)
- [Delete query](#delete-query)
- [Delete query by ID](#delete-query-by-id)
- [Delete queries](#delete-queries)
- [Get queries specs](#get-queries-specs)
- [Get query spec](#get-query-spec)
- [Apply queries specs](#apply-queries-specs)
- [Check live query status](#check-live-query-status)
- [Check result store status](#check-result-store-status)
- [Run live query](#run-live-query)
- [Run live query by name](#run-live-query-by-name)
- [Retrieve live query results (standard WebSocket API)](#retrieve-live-query-results-standard-websocket-api)
- [Retrieve live query results (SockJS)](#retrieve-live-query-results-sockjs)

### Get query

Returns the query specified by ID.

`GET /api/v1/fleet/queries/{id}`

#### Parameters

| Name | Type    | In   | Description                                |
| ---- | ------- | ---- | ------------------------------------------ |
| id   | integer | path | **Required**. The id of the desired query. |

#### Example

`GET /api/v1/fleet/queries/31`

##### Default response

`Status: 200`

```json
{
  "query": {
    "created_at": "2021-01-19T17:08:24Z",
    "updated_at": "2021-01-19T17:08:24Z",
    "id": 31,
    "name": "centos_hosts",
    "description": "",
    "query": "select 1 from os_version where platform = \"centos\";",
    "saved": true,
    "observer_can_run": true,
    "author_id": 1,
    "author_name": "John",
    "packs": [
      {
        "created_at": "2021-01-19T17:08:31Z",
        "updated_at": "2021-01-19T17:08:31Z",
        "id": 14,
        "name": "test_pack",
        "description": "",
        "platform": "",
        "disabled": false
      }
    ]
  }
}
```

### List queries

Returns a list of all queries in the Fleet instance.

`GET /api/v1/fleet/queries`

#### Parameters

| Name            | Type   | In    | Description                                                                                                                   |
| --------------- | ------ | ----- | ----------------------------------------------------------------------------------------------------------------------------- |
| order_key       | string | query | What to order results by. Can be any column in the queries table.                                                             |
| order_direction | string | query | **Requires `order_key`**. The direction of the order given the order key. Options include `asc` and `desc`. Default is `asc`. |

#### Example

`GET /api/v1/fleet/queries`

##### Default response

`Status: 200`

```json
{
"queries": [
  {
    "created_at": "2021-01-04T21:19:57Z",
    "updated_at": "2021-01-04T21:19:57Z",
    "id": 1,
    "name": "query1",
    "description": "query",
    "query": "SELECT * FROM osquery_info",
    "saved": true,
    "observer_can_run": true,
    "author_id": 1,
    "author_name": "noah",
    "packs": [
      {
        "created_at": "2021-01-05T21:13:04Z",
        "updated_at": "2021-01-07T19:12:54Z",
        "id": 1,
        "name": "Pack",
        "description": "Pack",
        "platform": "",
        "disabled": true
      }
    ]
  },
  {
    "created_at": "2021-01-19T17:08:24Z",
    "updated_at": "2021-01-19T17:08:24Z",
    "id": 3,
    "name": "osquery_schedule",
    "description": "Report performance stats for each file in the query schedule.",
    "query": "select name, interval, executions, output_size, wall_time, (user_time/executions) as avg_user_time, (system_time/executions) as avg_system_time, average_memory, last_executed from osquery_schedule;",
    "saved": true,
    "observer_can_run": true,
    "author_id": 1,
    "author_name": "noah",
    "packs": [
      {
        "created_at": "2021-01-19T17:08:31Z",
        "updated_at": "2021-01-19T17:08:31Z",
        "id": 14,
        "name": "test_pack",
        "description": "",
        "platform": "",
        "disabled": false
      }
    ]
  },
]
```

### Create query

`POST /api/v1/fleet/queries`

#### Parameters

| Name             | Type   | In   | Description                                                                                                                                            |
| ---------------- | ------ | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| name             | string | body | **Required**. The name of the query.                                                                                                                   |
| query            | string | body | **Required**. The query in SQL syntax.                                                                                                                 |
| description      | string | body | The query's description.                                                                                                                               |
| observer_can_run | bool   | body | Whether or not users with the `observer` role can run the query. In Fleet 4.0.0, 3 user roles were introduced (`admin`, `maintainer`, and `observer`). |

#### Example

`POST /api/v1/fleet/queries`

##### Request body

```json
{
  "description": "This is a new query.",
  "name": "new_query",
  "query": "SELECT * FROM osquery_info"
}
```

##### Default response

`Status: 200`

```json
{
  "query": {
    "created_at": "0001-01-01T00:00:00Z",
    "updated_at": "0001-01-01T00:00:00Z",
    "id": 288,
    "name": "new_query",
    "description": "This is a new query.",
    "query": "SELECT * FROM osquery_info",
    "saved": true,
    "author_id": 1,
    "author_name": "",
    "observer_can_run": true,
    "packs": []
  }
}
```

### Modify query

Returns the query specified by ID.

`PATCH /api/v1/fleet/queries/{id}`

#### Parameters

| Name             | Type    | In   | Description                                                                                                                                            |
| ---------------- | ------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| id               | integer | path | **Required.** The ID of the query.                                                                                                                     |
| name             | string  | body | The name of the query.                                                                                                                                 |
| query            | string  | body | The query in SQL syntax.                                                                                                                               |
| description      | string  | body | The query's description.                                                                                                                               |
| observer_can_run | bool    | body | Whether or not users with the `observer` role can run the query. In Fleet 4.0.0, 3 user roles were introduced (`admin`, `maintainer`, and `observer`). |

#### Example

`PATCH /api/v1/fleet/queries/2`

##### Request body

```json
{
  "name": "new_title_for_my_query"
}
```

##### Default response

`Status: 200`

```json
{
  "query": {
    "created_at": "2021-01-22T17:23:27Z",
    "updated_at": "2021-01-22T17:23:27Z",
    "id": 288,
    "name": "new_title_for_my_query",
    "description": "This is a new query.",
    "query": "SELECT * FROM osquery_info",
    "saved": true,
    "author_id": 1,
    "author_name": "noah",
    "observer_can_run": true,
    "packs": []
  }
}
```

### Delete query

Deletes the query specified by name.

`DELETE /api/v1/fleet/queries/{name}`

#### Parameters

| Name | Type   | In   | Description                          |
| ---- | ------ | ---- | ------------------------------------ |
| name | string | path | **Required.** The name of the query. |

#### Example

`DELETE /api/v1/fleet/queries/{name}`

##### Default response

`Status: 200`

```json
{}
```

### Delete query by ID

Deletes the query specified by ID.

`DELETE /api/v1/fleet/queries/id/{id}`

#### Parameters

| Name | Type    | In   | Description                        |
| ---- | ------- | ---- | ---------------------------------- |
| id   | integer | path | **Required.** The ID of the query. |

#### Example

`DELETE /api/v1/fleet/queries/id/28`

##### Default response

`Status: 200`

```json
{}
```

### Delete queries

Deletes the queries specified by ID. Returns the count of queries successfully deleted.

`POST /api/v1/fleet/queries/delete`

#### Parameters

| Name | Type | In   | Description                           |
| ---- | ---- | ---- | ------------------------------------- |
| ids  | list | body | **Required.** The IDs of the queries. |

#### Example

`POST /api/v1/fleet/queries/delete`

##### Request body

```json
{
  "ids": [
    2, 24, 25
  ]
}
```

##### Default response

`Status: 200`

```json
{
  "deleted": 3
}
```

### Get queries specs

Returns a list of all queries in the Fleet instance. Each item returned includes the name, description, and SQL of the query.

`GET /api/v1/fleet/spec/queries`

#### Parameters

None.

#### Example

`GET /api/v1/fleet/spec/queries`

##### Default response

`Status: 200`

```json
{
  "specs": [
    {
        "name": "query1",
        "description": "query",
        "query": "SELECT * FROM osquery_info"
    },
    {
        "name": "osquery_schedule",
        "description": "Report performance stats for each file in the query schedule.",
        "query": "select name, interval, executions, output_size, wall_time, (user_time/executions) as avg_user_time, (system_time/executions) as avg_system_time, average_memory, last_executed from osquery_schedule;"
    }
  ]
}
```

### Get query spec

Returns the name, description, and SQL of the query specified by name.

`GET /api/v1/fleet/spec/queries/{name}`

#### Parameters

| Name | Type   | In   | Description                          |
| ---- | ------ | ---- | ------------------------------------ |
| name | string | path | **Required.** The name of the query. |

#### Example

`GET /api/v1/fleet/spec/queries/query1`

##### Default response

`Status: 200`

```json
{
    "specs": {
        "name": "query1",
        "description": "query",
        "query": "SELECT * FROM osquery_info"
    }
}
```

### Apply queries specs

Creates and/or modifies the queries included in the specs list. To modify an existing query, the name of the query included in `specs` must already be used by an existing query. If a query with the specified name doesn't exist in Fleet, a new query will be created.

`POST /api/v1/fleet/spec/queries`

#### Parameters

| Name  | Type | In   | Description                                                      |
| ----- | ---- | ---- | ---------------------------------------------------------------- |
| specs | list | body | **Required.** The list of the queries to be created or modified. |

#### Example

`POST /api/v1/fleet/spec/queries`

##### Request body

```json
{
  "specs": [
    {
        "name": "new_query",
        "description": "This will be a new query because a query with the name 'new_query' doesn't exist in Fleet.",
        "query": "SELECT * FROM osquery_info"
    },
    {
        "name": "osquery_schedule",
        "description": "This queries description and SQL will be modified because a query with the name 'osquery_schedule' exists in Fleet.",
        "query": "SELECT * FROM osquery_info"
    }
  ]
}
```

##### Default response

`Status: 200`

```json
{}
```

### Live query health check

Checks the status of the Fleet's ability to run a live query. If an error is present in the response, Fleet won't be able to successfully run a live query. This endpoint is used by the Fleet UI to make sure that the Fleet instance is correctly configured to run live queries.

`GET /api/v1/fleet/status/live_query`

#### Parameters

None.

#### Example

`GET /api/v1/fleet/status/live_query`

##### Default response

`Status: 200`

```json
{}
```

### live query result store health check

Checks the status of the Fleet's result store. If an error is present in the response, Fleet won't be able to successfully run a live query. This endpoint is used by the Fleet UI to make sure that the Fleet instance is correctly configured to run live queries.

`GET /api/v1/fleet/status/result_store`

#### Parameters

None.

#### Example

`GET /api/v1/fleet/status/result_store`

##### Default response

`Status: 200`

```json
{}
```

### Run live query

Runs the specified query as a live query on the specified hosts or group of hosts. Returns a new live query campaign. Individual hosts must be specified with the host's ID. Groups of hosts are specified by label ID.

After the query has been initiated, [get results via WebSocket](#retrieve-live-query-results-standard-websocket-api).

`POST /api/v1/fleet/queries/run`

#### Parameters

| Name     | Type    | In   | Description                                                                                                                                                |
| -------- | ------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| query    | string  | body | The SQL if using a custom query.                                                                                                                           |
| query_id | integer | body | The saved query (if any) that will be run. Required if running query as an observer. The `observer_can_run` property on the query effects which targets are included.                                |
| selected | object  | body | **Required.** The desired targets for the query specified by ID. This object can contain `hosts`, `labels`, and/or `teams` properties. See examples below. |

One of `query` and `query_id` must be specified.

#### Example with one host targeted by ID

`POST /api/v1/fleet/queries/run`

##### Request body

```json
{
  "query": "select instance_id from system_info",
  "selected": {
    "hosts": [171]
  }
}
```

##### Default response

`Status: 200`

```json
{
  "campaign": {
    "created_at": "0001-01-01T00:00:00Z",
    "updated_at": "0001-01-01T00:00:00Z",
    "Metrics": {
      "TotalHosts": 1,
      "OnlineHosts": 0,
      "OfflineHosts": 1,
      "MissingInActionHosts": 0,
      "NewHosts": 1
    },
    "id": 1,
    "query_id": 3,
    "status": 0,
    "user_id": 1
  }
}
```

#### Example with multiple hosts targeted by label ID

`POST /api/v1/fleet/queries/run`

##### Request body

```json
{
  "query": "select instance_id from system_info;",
  "selected": {
    "labels": [7]
  }
}
```

##### Default response

`Status: 200`

```json
{
  "campaign": {
    "created_at": "0001-01-01T00:00:00Z",
    "updated_at": "0001-01-01T00:00:00Z",
    "Metrics": {
      "TotalHosts": 102,
      "OnlineHosts": 0,
      "OfflineHosts": 24,
      "MissingInActionHosts": 0,
      "NewHosts": 0
    },
    "id": 2,
    "query_id": 3,
    "status": 0,
    "user_id": 1
  }
}
```

### Run live query by name

Runs the specified saved query as a live query on the specified targets. Returns a new live query campaign. Individual hosts must be specified with the host's hostname. Groups of hosts are specified by label name.

After the query has been initiated, [get results via WebSocket](#retrieve-live-query-results-standard-websocket-api).

`POST /api/v1/fleet/queries/run_by_names`

#### Parameters

| Name     | Type    | In   | Description                                                                                                                                                  |
| -------- | ------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| query    | string  | body | The SQL of the query.                                                                                                                                        |
| query_id | integer | body | The saved query (if any) that will be run. The `observer_can_run` property on the query effects which targets are included.                                  |
| selected | object  | body | **Required.** The desired targets for the query specified by name. This object can contain `hosts`, `labels`, and/or `teams` properties. See examples below. |

One of `query` and `query_id` must be specified.

#### Example with one host targeted by hostname

`POST /api/v1/fleet/queries/run_by_names`

##### Request body

```json
{
  "query_id": 1,
  "selected": {
    "hosts": [
      "macbook-pro.local",
    ]
  }
}
```

##### Default response

`Status: 200`

```json
{
  "campaign": {
      "created_at": "0001-01-01T00:00:00Z",
      "updated_at": "0001-01-01T00:00:00Z",
      "Metrics": {
          "TotalHosts": 1,
          "OnlineHosts": 0,
          "OfflineHosts": 1,
          "MissingInActionHosts": 0,
          "NewHosts": 1
      },
      "id": 1,
      "query_id": 3,
      "status": 0,
      "user_id": 1
  }
}
```

#### Example with multiple hosts targeted by label name

`POST /api/v1/fleet/queries/run_by_names`

##### Request body

```json
{
  "query": "select instance_id from system_info",
  "selected": {
    "labels": [
      "All Hosts"
    ]
  }
}
```

##### Default response

`Status: 200`

```json
{
  "campaign": {
      "created_at": "0001-01-01T00:00:00Z",
      "updated_at": "0001-01-01T00:00:00Z",
      "Metrics": {
          "TotalHosts": 102,
          "OnlineHosts": 0,
          "OfflineHosts": 24,
          "MissingInActionHosts": 0,
          "NewHosts": 1
      },
      "id": 2,
      "query_id": 3,
      "status": 0,
      "user_id": 1
  }
}
```

### Retrieve live query results (standard WebSocket API)

You can retrieve the results of a live query using the [standard WebSocket API](#https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_client_applications).

Before you retrieve the live query results, you must create a live query campaign by running the live query. Use the [Run live query](#run-live-query) or [Run live query by name](#run-live-query-by-name) endpoints to create a live query campaign.

Note that live queries are automatically cancelled if this method is not called to start retrieving the results within 60 seconds of initiating the query.

`/api/v1/fleet/results/websockets`

#### Parameters

| Name       | Type    | In  | Description                                                      |
| ---------- | ------- | --- | ---------------------------------------------------------------- |
| token      | string  |     | **Required.** The token used to authenticate with the Fleet API. |
| campaignID | integer |     | **Required.** The ID of the live query campaign.                 |

#### Example

##### Example script to handle request and response

```
const socket = new WebSocket('wss://<your-base-url>/api/v1/fleet/results/websocket');

socket.onopen = () => {
  socket.send(JSON.stringify({ type: 'auth', data: { token: <auth-token> } }));
  socket.send(JSON.stringify({ type: 'select_campaign', data: { campaign_id: <campaign-id> } }));
};

socket.onmessage = ({ data }) => {
  console.log(data);
  const message = JSON.parse(data);
  if (message.type === 'status' && message.data.status === 'finished') {
    socket.close();
  }
}
```

##### Detailed request and response walkthrough with example data

##### webSocket.onopen()

###### Response data

```json
o
```

##### webSocket.send()

###### Request data

```json
[
  {
    "type": "auth",
    "data": { "token": <insert_token_here> }
  }
]
```

```json
[
  {
    "type": "select_campaign",
    "data": { "campaign_id": 12 }
  }
]
```

##### webSocket.onmessage()

###### Response data

```json
// Sends the total number of hosts targeted and segments them by status

[
  {
    "type": "totals",
    "data": {
      "count": 24,
      "online": 6,
      "offline": 18,
      "missing_in_action": 0
    }

  }
]
```

```json
// Sends the expected results, actual results so far, and the status of the live query

[
  {
    "type": "status",
    "data": {
      "expected_results": 6,
      "actual_results": 0,
      "status": "pending"
    }

  }
]
```

```json
// Sends the result for a given host

[
  {
    "type": "result",
    "data": {
      "distributed_query_execution_id": 39,
      "host": {
        // host data
      },
      "rows": [
        // query results data for the given host
      ],
      "error": null
    }
  }
]
```

```json
// Sends the status of "finished" when messages with the results for all expected hosts have been sent

[
  {
    "type": "status",
    "data": {
      "expected_results": 6,
      "actual_results": 6,
      "status": "finished"
    }

  }
]
```

### Retrieve live query results (SockJS)

You can also retrieve live query results with a [SockJS client](https://github.com/sockjs/sockjs-client). The script to handle the request and response messages will look similar to the standard WebSocket API script with slight variations. For example, the constructor used for SockJS is `SockJS` while the constructor used for the standard WebSocket API is `WebSocket`.

Note that SockJS has been found to be substantially less reliable than the [standard WebSockets approach](#retrieve-live-query-results-standard-websocket-api).

`/api/v1/fleet/results/`

#### Parameters

| Name       | Type    | In  | Description                                                      |
| ---------- | ------- | --- | ---------------------------------------------------------------- |
| token      | string  |     | **Required.** The token used to authenticate with the Fleet API. |
| campaignID | integer |     | **Required.** The ID of the live query campaign.                 |

#### Example

##### Example script to handle request and response

```
const socket = new SockJS(`<your-base-url>/api/v1/fleet/results`, undefined, {});

socket.onopen = () => {
  socket.send(JSON.stringify({ type: 'auth', data: { token: <token> } }));
  socket.send(JSON.stringify({ type: 'select_campaign', data: { campaign_id: <campaignID> } }));
};

socket.onmessage = ({ data }) => {
  console.log(data);
  const message = JSON.parse(data);

  if (message.type === 'status' && message.data.status === 'finished') {
    socket.close();
  }
}
```

##### Detailed request and response walkthrough

##### socket.onopen()

###### Response data

```json
o
```

##### socket.send()

###### Request data

```json
[
  {
    "type": "auth",
    "data": { "token": <insert_token_here> }
  }
]
```

```json
[
  {
    "type": "select_campaign",
    "data": { "campaign_id": 12 }
  }
]
```

##### socket.onmessage()

###### Response data

```json
// Sends the total number of hosts targeted and segments them by status

[
  {
    "type": "totals",
    "data": {
      "count": 24,
      "online": 6,
      "offline": 18,
      "missing_in_action": 0
    }

  }
]
```

```json
// Sends the expected results, actual results so far, and the status of the live query

[
  {
    "type": "status",
    "data": {
      "expected_results": 6,
      "actual_results": 0,
      "status": "pending"
    }

  }
]
```

```json
// Sends the result for a given host

[
  {
    "type": "result",
    "data": {
      "distributed_query_execution_id": 39,
      "host": {
        // host data
      },
      "rows": [
        // query results data for the given host
      ],
      "error": null
    }
  }
]
```

```json
// Sends the status of "finished" when messages with the results for all expected hosts have been sent

[
  {
    "type": "status",
    "data": {
      "expected_results": 6,
      "actual_results": 6,
      "status": "finished"
    }

  }
]
```

---

## Schedule

- [Get schedule](#get-schedule)
- [Add query to schedule](#add-query-to-schedule)
- [Edit query in schedule](#edit-query-in-schedule)
- [Remove query from schedule](#remove-query-from-schedule)

`In Fleet 4.1.0, the Schedule feature was introduced.`

Fleet’s query schedule lets you add queries which are executed on your devices at regular intervals.

For those familiar with osquery query packs, Fleet's query schedule can be thought of as a query pack built into Fleet. Instead of creating a query pack and then adding queries, just add queries to Fleet's query schedule to start running them against all your devices.

### Get schedule

`GET /api/v1/fleet/global/schedule`

#### Parameters

None.

#### Example

`GET /api/v1/fleet/global/schedule`

##### Default response

`Status: 200`

```json
{
  "global_schedule": [
    {
      "created_at": "0001-01-01T00:00:00Z",
      "updated_at": "0001-01-01T00:00:00Z",
      "id": 4,
      "pack_id": 1,
      "name": "arp_cache",
      "query_id": 2,
      "query_name": "arp_cache",
      "query": "select * from arp_cache;",
      "interval": 120,
      "snapshot": true,
      "removed": null,
      "platform": "",
      "version": "",
      "shard": null,
      "denylist": null
    },
    {
      "created_at": "0001-01-01T00:00:00Z",
      "updated_at": "0001-01-01T00:00:00Z",
      "id": 5,
      "pack_id": 1,
      "name": "disk_encryption",
      "query_id": 7,
      "query_name": "disk_encryption",
      "query": "select * from disk_encryption;",
      "interval": 86400,
      "snapshot": true,
      "removed": null,
      "platform": "",
      "version": "",
      "shard": null,
      "denylist": null
    }
  ]
}
```

### Add query to schedule

`POST /api/v1/fleet/global/schedule`

#### Parameters

| Name     | Type    | In   | Description                                                                                                                      |
| -------- | ------- | ---- | -------------------------------------------------------------------------------------------------------------------------------- |
| query_id | integer | body | **Required.** The query's ID.                                                                                                    |
| interval | integer | body | **Required.** The amount of time, in seconds, the query waits before running.                                                    |
| snapshot | boolean | body | **Required.** Whether the queries logs show everything in its current state.                                                     |
| removed  | boolean | body | Whether "removed" actions should be logged. Default is `null`.                                                                   |
| platform | string  | body | The computer platform where this query will run (other platforms ignored). Empty value runs on all platforms. Default is `null`. |
| shard    | integer | body | Restrict this query to a percentage (1-100) of target hosts. Default is `null`.                                                  |
| version  | string  | body | The minimum required osqueryd version installed on a host. Default is `null`.                                                    |

#### Example

`POST /api/v1/fleet/global/schedule`

##### Request body

```json
{
  "interval": 86400,
  "query_id": 2,
  "snapshot": true,
}
```

##### Default response

`Status: 200`

```json
{
  "scheduled": {
    "created_at": "0001-01-01T00:00:00Z",
    "updated_at": "0001-01-01T00:00:00Z",
    "id": 1,
    "pack_id": 5,
    "name": "arp_cache",
    "query_id": 2,
    "query_name": "arp_cache",
    "query": "select * from arp_cache;",
    "interval": 86400,
    "snapshot": true,
    "removed": null,
    "platform": "",
    "version": "",
    "shard": null,
    "denylist": null
  }
}
```

> Note that the `pack_id` is included in the response object because Fleet's Schedule feature uses osquery query packs under the hood.

### Edit query in schedule

`PATCH /api/v1/fleet/global/schedule/{id}`

#### Parameters

| Name     | Type    | In   | Description                                                                                                   |
| -------- | ------- | ---- | ------------------------------------------------------------------------------------------------------------- |
| id       | integer | path | **Required.** The scheduled query's ID.                                                                       |
| interval | integer | body | The amount of time, in seconds, the query waits before running.                                               |
| snapshot | boolean | body | Whether the queries logs show everything in its current state.                                                |
| removed  | boolean | body | Whether "removed" actions should be logged.                                                                   |
| platform | string  | body | The computer platform where this query will run (other platforms ignored). Empty value runs on all platforms. |
| shard    | integer | body | Restrict this query to a percentage (1-100) of target hosts.                                                  |
| version  | string  | body | The minimum required osqueryd version installed on a host.                                                    |

#### Example

`PATCH /api/v1/fleet/global/schedule/5`

##### Request body

```json
{
  "interval": 604800,
}
```

##### Default response

`Status: 200`

```json
{
  "scheduled": {
    "created_at": "2021-07-16T14:40:15Z",
    "updated_at": "2021-07-16T14:40:15Z",
    "id": 5,
    "pack_id": 1,
    "name": "arp_cache",
    "query_id": 2,
    "query_name": "arp_cache",
    "query": "select * from arp_cache;",
    "interval": 604800,
    "snapshot": true,
    "removed": null,
    "platform": "",
    "shard": null,
    "denylist": null
  }
}
```

### Remove query from schedule

`DELETE /api/v1/fleet/global/schedule/{id}`

#### Parameters

None.

#### Example

`DELETE /api/v1/fleet/global/schedule/5`

##### Default response

`Status: 200`

```json
{}
```

---

### Team schedule

- [Get team schedule](#get-team-schedule)
- [Add query to team schedule](#add-query-to-team-schedule)
- [Edit query in team schedule](#edit-query-in-team-schedule)
- [Remove query from team schedule](#remove-query-from-team-schedule)

`In Fleet 4.2.0, the Team Schedule feature was introduced.`

This allows you to easily configure scheduled queries that will impact a whole team of devices.

#### Get team schedule

`GET /api/v1/fleet/team/{id}/schedule`

#### Parameters

| Name            | Type    | In    | Description                                                                                                                   |
| --------------- | ------- | ----- | ----------------------------------------------------------------------------------------------------------------------------- |
| id              | integer | path  | **Required**. The team's ID.                                                                                                  |
| page            | integer | query | Page number of the results to fetch.                                                                                          |
| per_page        | integer | query | Results per page.                                                                                                             |
| order_key       | string  | query | What to order results by. Can be any column in the `activites` table.                                                         |
| order_direction | string  | query | **Requires `order_key`**. The direction of the order given the order key. Options include `asc` and `desc`. Default is `asc`. |

#### Example

`GET /api/v1/fleet/team/2/schedule`

##### Default response

`Status: 200`

```json
{
  "scheduled": [
    {
      "created_at": "0001-01-01T00:00:00Z",
      "updated_at": "0001-01-01T00:00:00Z",
      "id": 4,
      "pack_id": 2,
      "name": "arp_cache",
      "query_id": 2,
      "query_name": "arp_cache",
      "query": "select * from arp_cache;",
      "interval": 120,
      "snapshot": true,
      "platform": "",
      "version": "",
      "removed": null,
      "shard": null,
      "denylist": null
    },
    {
      "created_at": "0001-01-01T00:00:00Z",
      "updated_at": "0001-01-01T00:00:00Z",
      "id": 5,
      "pack_id": 3,
      "name": "disk_encryption",
      "query_id": 7,
      "query_name": "disk_encryption",
      "query": "select * from disk_encryption;",
      "interval": 86400,
      "snapshot": true,
      "removed": null,
      "platform": "",
      "version": "",
      "shard": null,
      "denylist": null
    }
  ]
}
```

#### Add query to team schedule

`POST /api/v1/fleet/team/{id}/schedule`

#### Parameters

| Name     | Type    | In   | Description                                                                                                                      |
| -------- | ------- | ---- | -------------------------------------------------------------------------------------------------------------------------------- |
| id       | integer | path | **Required.** The teams's ID.                                                                                                    |
| query_id | integer | body | **Required.** The query's ID.                                                                                                    |
| interval | integer | body | **Required.** The amount of time, in seconds, the query waits before running.                                                    |
| snapshot | boolean | body | **Required.** Whether the queries logs show everything in its current state.                                                     |
| removed  | boolean | body | Whether "removed" actions should be logged. Default is `null`.                                                                   |
| platform | string  | body | The computer platform where this query will run (other platforms ignored). Empty value runs on all platforms. Default is `null`. |
| shard    | integer | body | Restrict this query to a percentage (1-100) of target hosts. Default is `null`.                                                  |
| version  | string  | body | The minimum required osqueryd version installed on a host. Default is `null`.                                                    |

#### Example

`POST /api/v1/fleet/team/2/schedule`

##### Request body

```json
{
  "interval": 86400,
  "query_id": 2,
  "snapshot": true,
}
```

##### Default response

`Status: 200`

```json
{
  "scheduled": {
    "created_at": "0001-01-01T00:00:00Z",
    "updated_at": "0001-01-01T00:00:00Z",
    "id": 1,
    "pack_id": 5,
    "name": "arp_cache",
    "query_id": 2,
    "query_name": "arp_cache",
    "query": "select * from arp_cache;",
    "interval": 86400,
    "snapshot": true,
    "removed": null,
    "shard": null,
    "denylist": null
  }
}
```

#### Edit query in team schedule

`PATCH /api/v1/fleet/team/{team_id}/schedule/{scheduled_query_id}`

#### Parameters

| Name               | Type    | In   | Description                                                                                                   |
| ------------------ | ------- | ---- | ------------------------------------------------------------------------------------------------------------- |
| team_id            | integer | path | **Required.** The team's ID.                                                                                  |
| scheduled_query_id | integer | path | **Required.** The scheduled query's ID.                                                                       |
| interval           | integer | body | The amount of time, in seconds, the query waits before running.                                               |
| snapshot           | boolean | body | Whether the queries logs show everything in its current state.                                                |
| removed            | boolean | body | Whether "removed" actions should be logged.                                                                   |
| platform           | string  | body | The computer platform where this query will run (other platforms ignored). Empty value runs on all platforms. |
| shard              | integer | body | Restrict this query to a percentage (1-100) of target hosts.                                                  |
| version            | string  | body | The minimum required osqueryd version installed on a host.                                                    |

#### Example

`PATCH /api/v1/fleet/team/2/schedule/5`

##### Request body

```json
{
  "interval": 604800,
}
```

##### Default response

`Status: 200`

```json
{
  "scheduled": {
    "created_at": "2021-07-16T14:40:15Z",
    "updated_at": "2021-07-16T14:40:15Z",
    "id": 5,
    "pack_id": 1,
    "name": "arp_cache",
    "query_id": 2,
    "query_name": "arp_cache",
    "query": "select * from arp_cache;",
    "interval": 604800,
    "snapshot": true,
    "removed": null,
    "platform": "",
    "shard": null,
    "denylist": null
  }
}
```

#### Remove query from team schedule

`DELETE /api/v1/fleet/team/{team_id}/schedule/{scheduled_query_id}`

#### Parameters

| Name               | Type    | In   | Description                             |
| ------------------ | ------- | ---- | --------------------------------------- |
| team_id            | integer | path | **Required.** The team's ID.            |
| scheduled_query_id | integer | path | **Required.** The scheduled query's ID. |

#### Example

`DELETE /api/v1/fleet/team/2/schedule/5`

##### Default response

`Status: 200`

```json
{}
```

---

## Packs

- [Create pack](#create-pack)
- [Modify pack](#modify-pack)
- [Get pack](#get-pack)
- [List packs](#list-packs)
- [Delete pack](#delete-pack)
- [Delete pack by ID](#delete-pack-by-id)
- [Get scheduled queries in a pack](#get-scheduled-queries-in-a-pack)
- [Add scheduled query to a pack](#add-scheduled-query-to-a-pack)
- [Get scheduled query](#get-scheduled-query)
- [Modify scheduled query](#modify-scheduled-query)
- [Delete scheduled query](#delete-scheduled-query)
- [Get packs specs](#get-packs-specs)
- [Apply packs specs](#apply-packs-specs)
- [Get pack spec by name](#get-pack-spec-by-name)

### Create pack

`POST /api/v1/fleet/packs`

#### Parameters

| Name        | Type   | In   | Description                                                             |
| ----------- | ------ | ---- | ----------------------------------------------------------------------- |
| name        | string | body | **Required**. The pack's name.                                          |
| description | string | body | The pack's description.                                                 |
| host_ids    | list   | body | A list containing the targeted host IDs.                                |
| label_ids   | list   | body | A list containing the targeted label's IDs.                             |
| team_ids    | list   | body | _Available in Fleet Premium_ A list containing the targeted teams' IDs. |

#### Example

`POST /api/v1/fleet/packs`

##### Request query parameters

```json
{
  "description": "Collects osquery data.",
  "host_ids": [],
  "label_ids": [6],
  "name": "query_pack_1"
}
```

##### Default response

`Status: 200`

```json
{
  "pack": {
    "created_at": "0001-01-01T00:00:00Z",
    "updated_at": "0001-01-01T00:00:00Z",
    "id": 17,
    "name": "query_pack_1",
    "description": "Collects osquery data.",
    "query_count": 0,
    "total_hosts_count": 223,
    "host_ids": [],
    "label_ids": [
      6
    ],
    "team_ids": [],
  }
}
```

### Modify pack

`PATCH /api/v1/fleet/packs/{id}`

#### Parameters

| Name        | Type    | In   | Description                                                             |
| ----------- | ------- | ---- | ----------------------------------------------------------------------- |
| id          | integer | path | **Required.** The pack's id.                                            |
| name        | string  | body | The pack's name.                                                        |
| description | string  | body | The pack's description.                                                 |
| host_ids    | list    | body | A list containing the targeted host IDs.                                |
| label_ids   | list    | body | A list containing the targeted label's IDs.                             |
| team_ids    | list    | body | _Available in Fleet Premium_ A list containing the targeted teams' IDs. |

#### Example

`PATCH /api/v1/fleet/packs/{id}`

##### Request query parameters

```json
{
  "description": "MacOS hosts are targeted",
  "host_ids": [],
  "label_ids": [7]
}
```

##### Default response

`Status: 200`

```json
{
  "pack": {
    "created_at": "2021-01-25T22:32:45Z",
    "updated_at": "2021-01-25T22:32:45Z",
    "id": 17,
    "name": "Title2",
    "description": "MacOS hosts are targeted",
    "query_count": 0,
    "total_hosts_count": 110,
    "host_ids": [],
    "label_ids": [
      7
    ],
    "team_ids": []
  }
}
```

### Get pack

`GET /api/v1/fleet/packs/{id}`

#### Parameters

| Name | Type    | In   | Description                  |
| ---- | ------- | ---- | ---------------------------- |
| id   | integer | path | **Required.** The pack's id. |

#### Example

`GET /api/v1/fleet/packs/17`

##### Default response

`Status: 200`

```json
{
  "pack": {
    "created_at": "2021-01-25T22:32:45Z",
    "updated_at": "2021-01-25T22:32:45Z",
    "id": 17,
    "name": "Title2",
    "description": "MacOS hosts are targeted",
    "query_count": 0,
    "total_hosts_count": 110,
    "host_ids": [],
    "label_ids": [
      7
    ],
    "team_ids": []
  }
}
```

### List packs

`GET /api/v1/fleet/packs`

#### Parameters

| Name            | Type   | In    | Description                                                                                                                   |
| --------------- | ------ | ----- | ----------------------------------------------------------------------------------------------------------------------------- |
| order_key       | string | query | What to order results by. Can be any column in the packs table.                                                               |
| order_direction | string | query | **Requires `order_key`**. The direction of the order given the order key. Options include `asc` and `desc`. Default is `asc`. |

#### Example

`GET /api/v1/fleet/packs`

##### Default response

`Status: 200`

```json
{
  "packs": [
    {
      "created_at": "2021-01-05T21:13:04Z",
      "updated_at": "2021-01-07T19:12:54Z",
      "id": 1,
      "name": "pack_number_one",
      "description": "This pack has a description",
      "disabled": true,
      "query_count": 1,
      "total_hosts_count": 53,
      "host_ids": [],
      "label_ids": [
        8
      ],
      "team_ids": [],
    },
    {
      "created_at": "2021-01-19T17:08:31Z",
      "updated_at": "2021-01-19T17:08:31Z",
      "id": 2,
      "name": "query_pack_2",
      "query_count": 5,
      "total_hosts_count": 223,
      "host_ids": [],
      "label_ids": [
        6
      ],
      "team_ids": [],
    },
  ]
}
```

### Delete pack

`DELETE /api/v1/fleet/packs/{name}`

#### Parameters

| Name | Type   | In   | Description                    |
| ---- | ------ | ---- | ------------------------------ |
| name | string | path | **Required.** The pack's name. |

#### Example

`DELETE /api/v1/fleet/packs/pack_number_one`

##### Default response

`Status: 200`

```json
{}
```

### Delete pack by ID

`DELETE /api/v1/fleet/packs/id/{id}`

#### Parameters

| Name | Type    | In   | Description                  |
| ---- | ------- | ---- | ---------------------------- |
| id   | integer | path | **Required.** The pack's ID. |

#### Example

`DELETE /api/v1/fleet/packs/id/1`

##### Default response

`Status: 200`

```json
{}
```

### Get scheduled queries in a pack

`GET /api/v1/fleet/packs/{id}/scheduled`

#### Parameters

| Name | Type    | In   | Description                  |
| ---- | ------- | ---- | ---------------------------- |
| id   | integer | path | **Required.** The pack's ID. |

#### Example

`GET /api/v1/fleet/packs/1/scheduled`

##### Default response

`Status: 200`

```json
{
  "scheduled": [
    {
      "created_at": "0001-01-01T00:00:00Z",
      "updated_at": "0001-01-01T00:00:00Z",
      "id": 49,
      "pack_id": 15,
      "name": "new_query",
      "query_id": 289,
      "query_name": "new_query",
      "query": "SELECT * FROM osquery_info",
      "interval": 456,
      "snapshot": false,
      "removed": true,
      "platform": "windows",
      "version": "4.6.0",
      "shard": null,
      "denylist": null
    },
    {
      "created_at": "0001-01-01T00:00:00Z",
      "updated_at": "0001-01-01T00:00:00Z",
      "id": 50,
      "pack_id": 15,
      "name": "new_title_for_my_query",
      "query_id": 288,
      "query_name": "new_title_for_my_query",
      "query": "SELECT * FROM osquery_info",
      "interval": 677,
      "snapshot": true,
      "removed": false,
      "platform": "windows",
      "version": "4.6.0",
      "shard": null,
      "denylist": null
    },
    {
      "created_at": "0001-01-01T00:00:00Z",
      "updated_at": "0001-01-01T00:00:00Z",
      "id": 51,
      "pack_id": 15,
      "name": "osquery_info",
      "query_id": 22,
      "query_name": "osquery_info",
      "query": "select i.*, p.resident_size, p.user_time, p.system_time, time.minutes as counter from osquery_info i, processes p, time where p.pid = i.pid;",
      "interval": 6667,
      "snapshot": true,
      "removed": false,
      "platform": "windows",
      "version": "4.6.0",
      "shard": null,
      "denylist": null
    },
  ]
}
```

### Add scheduled query to a pack

`POST /api/v1/fleet/schedule`

#### Parameters

| Name     | Type    | In   | Description                                                                                                   |
| -------- | ------- | ---- | ------------------------------------------------------------------------------------------------------------- |
| pack_id  | integer | body | **Required.** The pack's ID.                                                                                  |
| query_id | integer | body | **Required.** The query's ID.                                                                                 |
| interval | integer | body | **Required.** The amount of time, in seconds, the query waits before running.                                 |
| snapshot | boolean | body | **Required.** Whether the queries logs show everything in its current state.                                  |
| removed  | boolean | body | **Required.** Whether "removed" actions should be logged.                                                     |
| platform | string  | body | The computer platform where this query will run (other platforms ignored). Empty value runs on all platforms. |
| shard    | integer | body | Restrict this query to a percentage (1-100) of target hosts.                                                  |
| version  | string  | body | The minimum required osqueryd version installed on a host.                                                    |

#### Example

`POST /api/v1/fleet/schedule`

#### Request body

```json
{
  "interval": 120,
  "pack_id": 15,
  "query_id": 23,
  "removed": true,
  "shard": null,
  "snapshot": false,
  "version": "4.5.0",
  "platform": "windows"
}
```

##### Default response

`Status: 200`

```json
{
  "scheduled": {
    "created_at": "0001-01-01T00:00:00Z",
    "updated_at": "0001-01-01T00:00:00Z",
    "id": 56,
    "pack_id": 17,
    "name": "osquery_events",
    "query_id": 23,
    "query_name": "osquery_events",
    "query": "select name, publisher, type, subscriptions, events, active from osquery_events;",
    "interval": 120,
    "snapshot": false,
    "removed": true,
    "platform": "windows",
    "version": "4.5.0",
    "shard": 10
  }
}
```

### Get scheduled query

`GET /api/v1/fleet/schedule/{id}`

#### Parameters

| Name | Type    | In   | Description                             |
| ---- | ------- | ---- | --------------------------------------- |
| id   | integer | path | **Required.** The scheduled query's ID. |

#### Example

`GET /api/v1/fleet/schedule/56`

##### Default response

`Status: 200`

```json
{
  "scheduled": {
    "created_at": "0001-01-01T00:00:00Z",
    "updated_at": "0001-01-01T00:00:00Z",
    "id": 56,
    "pack_id": 17,
    "name": "osquery_events",
    "query_id": 23,
    "query_name": "osquery_events",
    "query": "select name, publisher, type, subscriptions, events, active from osquery_events;",
    "interval": 120,
    "snapshot": false,
    "removed": true,
    "platform": "windows",
    "version": "4.5.0",
    "shard": 10,
    "denylist": null,
  }
}
```

### Modify scheduled query

`PATCH /api/v1/fleet/schedule/{id}`

#### Parameters

| Name     | Type    | In   | Description                                                                                                   |
| -------- | ------- | ---- | ------------------------------------------------------------------------------------------------------------- |
| id       | integer | path | **Required.** The scheduled query's ID.                                                                       |
| interval | integer | body | The amount of time, in seconds, the query waits before running.                                               |
| snapshot | boolean | body | Whether the queries logs show everything in its current state.                                                |
| removed  | boolean | body | Whether "removed" actions should be logged.                                                                   |
| platform | string  | body | The computer platform where this query will run (other platforms ignored). Empty value runs on all platforms. |
| shard    | integer | body | Restrict this query to a percentage (1-100) of target hosts.                                                  |
| version  | string  | body | The minimum required osqueryd version installed on a host.                                                    |

#### Example

`PATCH /api/v1/fleet/schedule/56`

#### Request body

```json
{
  "platform": "",
}
```

##### Default response

`Status: 200`

```json
{
  "scheduled": {
    "created_at": "2021-01-28T19:40:04Z",
    "updated_at": "2021-01-28T19:40:04Z",
    "id": 56,
    "pack_id": 17,
    "name": "osquery_events",
    "query_id": 23,
    "query_name": "osquery_events",
    "query": "select name, publisher, type, subscriptions, events, active from osquery_events;",
    "interval": 120,
    "snapshot": false,
    "removed": true,
    "platform": "",
    "version": "4.5.0",
    "shard": 10
  }
}
```

### Delete scheduled query

`DELETE /api/v1/fleet/schedule/{id}`

#### Parameters

| Name | Type    | In   | Description                             |
| ---- | ------- | ---- | --------------------------------------- |
| id   | integer | path | **Required.** The scheduled query's ID. |

#### Example

`DELETE /api/v1/fleet/schedule/56`

##### Default response

`Status: 200`

```json
{}
```

### Get packs specs

Returns the specs for all packs in the Fleet instance.

`GET /api/v1/fleet/spec/packs`

#### Example

`GET /api/v1/fleet/spec/packs`

##### Default response

`Status: 200`

```json
{
  "specs": [
    {
      "id": 1,
      "name": "pack_1",
      "description": "Description",
      "disabled": false,
      "targets": {
        "labels": [
          "All Hosts"
        ]
      },
      "queries": [
        {
          "query": "new_query",
          "name": "new_query",
          "description": "",
          "interval": 456,
          "snapshot": false,
          "removed": true,
          "platform": "windows",
          "version": "4.5.0"
        },
        {
          "query": "new_title_for_my_query",
          "name": "new_title_for_my_query",
          "description": "",
          "interval": 677,
          "snapshot": true,
          "removed": false,
          "platform": "",
          "version": ""
        },
        {
          "query": "osquery_info",
          "name": "osquery_info",
          "description": "",
          "interval": 6667,
          "snapshot": true,
          "removed": false,
          "platform": "",
          "version": ""
        },
        {
          "query": "query1",
          "name": "query1",
          "description": "",
          "interval": 7767,
          "snapshot": false,
          "removed": true,
          "platform": "",
          "version": ""
        },
        {
          "query": "osquery_events",
          "name": "osquery_events",
          "description": "",
          "interval": 454,
          "snapshot": false,
          "removed": true,
          "platform": "",
          "version": ""
        },
        {
          "query": "osquery_events",
          "name": "osquery_events-1",
          "description": "",
          "interval": 120,
          "snapshot": false,
          "removed": true,
          "platform": "",
          "version": ""
        }
      ]
    },
    {
      "id": 2,
      "name": "pack_2",
      "disabled": false,
      "targets": {
        "labels": null
      },
      "queries": [
        {
          "query": "new_query",
          "name": "new_query",
          "description": "",
          "interval": 333,
          "snapshot": false,
          "removed": true,
          "platform": "windows",
          "version": "4.5.0",
          "shard": 10,
          "denylist": null
        }
      ]
    },
  ]
}
```

### Apply packs specs

Returns the specs for all packs in the Fleet instance.

`POST /api/v1/fleet/spec/packs`

#### Parameters

| Name  | Type | In   | Description                                                                                   |
| ----- | ---- | ---- | --------------------------------------------------------------------------------------------- |
| specs | list | body | **Required.** A list that includes the specs for each pack to be added to the Fleet instance. |

#### Example

`POST /api/v1/fleet/spec/packs`

##### Request body

```json
{
  "specs": [
    {
      "id": 1,
      "name": "pack_1",
      "description": "Description",
      "disabled": false,
      "targets": {
        "labels": [
          "All Hosts"
        ]
      },
      "queries": [
        {
          "query": "new_query",
          "name": "new_query",
          "description": "",
          "interval": 456,
          "snapshot": false,
          "removed": true
        },
        {
          "query": "new_title_for_my_query",
          "name": "new_title_for_my_query",
          "description": "",
          "interval": 677,
          "snapshot": true,
          "removed": false
        },
        {
          "query": "osquery_info",
          "name": "osquery_info",
          "description": "",
          "interval": 6667,
          "snapshot": true,
          "removed": false
        },
        {
          "query": "query1",
          "name": "query1",
          "description": "",
          "interval": 7767,
          "snapshot": false,
          "removed": true
        },
        {
          "query": "osquery_events",
          "name": "osquery_events",
          "description": "",
          "interval": 454,
          "snapshot": false,
          "removed": true
        },
        {
          "query": "osquery_events",
          "name": "osquery_events-1",
          "description": "",
          "interval": 120,
          "snapshot": false,
          "removed": true
        }
      ]
    },
    {
      "id": 2,
      "name": "pack_2",
      "disabled": false,
      "targets": {
        "labels": null
      },
      "queries": [
        {
          "query": "new_query",
          "name": "new_query",
          "description": "",
          "interval": 333,
          "snapshot": false,
          "removed": true,
          "platform": "windows"
        }
      ]
    },
  ]
}
```

##### Default response

`Status: 200`

```json
{}
```

### Get pack spec by name

Returns the spec for the specified pack by pack name.

`GET /api/v1/fleet/spec/packs/{name}`

#### Parameters

| Name | Type   | In   | Description                    |
| ---- | ------ | ---- | ------------------------------ |
| name | string | path | **Required.** The pack's name. |

#### Example

`GET /api/v1/fleet/spec/packs/pack_1`

##### Default response

`Status: 200`

```json
{
  "specs": {
    "id": 15,
    "name": "pack_1",
    "description": "Description",
    "disabled": false,
    "targets": {
      "labels": [
        "All Hosts"
      ]
    },
    "queries": [
      {
        "query": "new_title_for_my_query",
        "name": "new_title_for_my_query",
        "description": "",
        "interval": 677,
        "snapshot": true,
        "removed": false,
        "platform": "",
        "version": "",
      },
      {
        "query": "osquery_info",
        "name": "osquery_info",
        "description": "",
        "interval": 6667,
        "snapshot": true,
        "removed": false,
        "platform": "",
        "version": "",
      },
      {
        "query": "query1",
        "name": "query1",
        "description": "",
        "interval": 7767,
        "snapshot": false,
        "removed": true,
        "platform": "",
        "version": "",
      },
      {
        "query": "osquery_events",
        "name": "osquery_events",
        "description": "",
        "interval": 454,
        "snapshot": false,
        "removed": true,
        "platform": "",
        "version": "",
      },
      {
        "query": "osquery_events",
        "name": "osquery_events-1",
        "description": "",
        "interval": 120,
        "snapshot": false,
        "removed": true,
        "platform": "",
        "version": "",
      }
    ]
  }
}
```

---

## Policies

- [List policies](#list-policies)
- [Get policy by ID](#get-policy-by-id)
- [Add policy](#add-policy)
- [Remove policies](#remove-policies)

`In Fleet 4.3.0, the Policies feature was introduced.`

Policies allow you to see which hosts meet a certain standard.

Policies in Fleet are defined by osquery queries.

Host that return results for a policy's query are "Passing."

Hosts that do not return results for a policy's query are "Failing."

### List policies

`GET /api/v1/fleet/global/policies`

#### Example

`GET /api/v1/fleet/global/policies`

##### Default response

`Status: 200`

```json
{
  "policies": [
    {
      "id": 1,
      "query_id": 2,
      "query_name": "Gatekeeper enabled",
      "passing_host_count": 2000,
      "failing_host_count": 300,
    },
    {
      "id": 2,
      "query_id": 3,
      "query_name": "Primary disk encrypted",
      "passing_host_count": 2300,
      "failing_host_count": 0,
    }
  ]
}
```

### Get policy by ID

`GET /api/v1/fleet/global/policies/{id}`

#### Parameters

| Name               | Type    | In   | Description                                                                                                   |
| ------------------ | ------- | ---- | ------------------------------------------------------------------------------------------------------------- |
| id          | integer | path | **Required.** The policy's ID.                                                                                  |

#### Example

`GET /api/v1/fleet/global/policies/1`

##### Default response

`Status: 200`

```json
{
  "policy": {
    "id": 1,
    "query_id": 2,
    "query_name": "Gatekeeper enabled",
    "passing_host_count": 2000,
    "failing_host_count": 300,
  }
}
```

### Add policy

`POST /api/v1/fleet/global/policies`

#### Parameters

| Name     | Type    | In   | Description                    |
| -------- | ------- | ---- | ------------------------------ |
| query_id | integer | body | **Required.** The query's ID.  |

#### Example

`POST /api/v1/fleet/global/policies`

#### Request body

```json
{
  "query_id": 12
}
```

##### Default response

`Status: 200`

```json
{
  "policy": {
      "id": 2,
      "query_id": 2,
      "query_name": "Primary disk encrypted",
      "passing_host_count": 0,
      "failing_host_count": 0,
    },
}
```

### Remove policies

`POST /api/v1/fleet/global/policies/delete`

#### Parameters

| Name     | Type    | In   | Description                                       |
| -------- | ------- | ---- | ------------------------------------------------- |
| ids      | list    | body | **Required.** The IDs of the policies to delete.  |

#### Example

`POST /api/v1/fleet/global/policies/delete`

#### Request body

```json
{
  "ids": [ 1 ]
}
```

##### Default response

`Status: 200`

```json
{
  "deleted": 1
}
```

---

## Activities

### List activities

Returns a list of the activities that have been performed in Fleet. The following types of activity are included:

- Created pack
- Edited pack
- Deleted pack
- Applied pack spec
- Created saved query
- Edited saved query
- Deleted saved query
- Applied query spec
- Ran live query
- Created team - _Available in Fleet Premium_
- Deleted team - _Available in Fleet Premium_

`GET /api/v1/fleet/activities`

#### Parameters

| Name            | Type    | In    | Description                                                                                                                   |
| --------------- | ------- | ----- | ----------------------------------------------------------------------------------------------------------------------------- |
| page            | integer | query | Page number of the results to fetch.                                                                                          |
| per_page        | integer | query | Results per page.                                                                                                             |
| order_key       | string  | query | What to order results by. Can be any column in the `activites` table.                                                         |
| order_direction | string  | query | **Requires `order_key`**. The direction of the order given the order key. Options include `asc` and `desc`. Default is `asc`. |

#### Example

`GET /api/v1/fleet/activities?page=0&per_page=10&order_key=created_at&order_direction=desc`

##### Default response

```json
{
  "activities": [
    {
      "created_at": "2021-07-30T13:41:07Z",
      "id": 24,
      "actor_full_name": "name",
      "actor_id": 1,
      "actor_gravatar": "",
      "actor_email": "name@example.com",
      "type": "live_query",
      "details": {
        "targets_count": 231
      }
    },
    {
      "created_at": "2021-07-29T15:35:33Z",
      "id": 23,
      "actor_full_name": "name",
      "actor_id": 1,
      "actor_gravatar": "",
      "actor_email": "name@example.com",
      "type": "deleted_multiple_saved_query",
      "details": {
        "query_ids": [
          2,
          24,
          25
        ]
      }
    },
    {
      "created_at": "2021-07-29T14:40:30Z",
      "id": 22,
      "actor_full_name": "name",
      "actor_id": 1,
      "actor_gravatar": "",
      "actor_email": "name@example.com",
      "type": "created_team",
      "details": {
        "team_id": 3,
        "team_name": "Oranges"
      }
    },
    {
      "created_at": "2021-07-29T14:40:27Z",
      "id": 21,
      "actor_full_name": "name",
      "actor_id": 1,
      "actor_gravatar": "",
      "actor_email": "name@example.com",
      "type": "created_team",
      "details": {
        "team_id": 2,
        "team_name": "Apples"
      }
    },
    {
      "created_at": "2021-07-27T14:35:08Z",
      "id": 20,
      "actor_full_name": "name",
      "actor_id": 1,
      "actor_gravatar": "",
      "actor_email": "name@example.com",
      "type": "created_pack",
      "details": {
        "pack_id": 2,
        "pack_name": "New pack"
      }
    },
    {
      "created_at": "2021-07-27T13:25:21Z",
      "id": 19,
      "actor_full_name": "name",
      "actor_id": 1,
      "actor_gravatar": "",
      "actor_email": "name@example.com",
      "type": "live_query",
      "details": {
        "targets_count": 14
      }
    },
    {
      "created_at": "2021-07-27T13:25:14Z",
      "id": 18,
      "actor_full_name": "name",
      "actor_id": 1,
      "actor_gravatar": "",
      "actor_email": "name@example.com",
      "type": "live_query",
      "details": {
        "targets_count": 14
      }
    },
    {
      "created_at": "2021-07-26T19:28:24Z",
      "id": 17,
      "actor_full_name": "name",
      "actor_id": 1,
      "actor_gravatar": "",
      "actor_email": "name@example.com",
      "type": "live_query",
      "details": {
        "target_counts": 1
      }
    },
    {
      "created_at": "2021-07-26T17:27:37Z",
      "id": 16,
      "actor_full_name": "name",
      "actor_id": 1,
      "actor_gravatar": "",
      "actor_email": "name@example.com",
      "type": "live_query",
      "details": {
        "target_counts": 14
      }
    },
    {
      "created_at": "2021-07-26T17:27:08Z",
      "id": 15,
      "actor_full_name": "name",
      "actor_id": 1,
      "actor_gravatar": "",
      "actor_email": "name@example.com",
      "type": "live_query",
      "details": {
        "target_counts": 14
      }
    }
  ]
}

```

---

## Targets

In Fleet, targets are used to run queries against specific hosts or groups of hosts. Labels are used to create groups in Fleet.

### Search targets

The search targets endpoint returns two lists. The first list includes the possible target hosts in Fleet given the search query provided and the hosts already selected as targets. The second list includes the possible target labels in Fleet given the search query provided and the labels already selected as targets.

The returned lists are filtered based on the hosts the requesting user has access to.

`POST /api/v1/fleet/targets`

#### Parameters

| Name     | Type    | In   | Description                                                                                                                                                                |
| -------- | ------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| query    | string  | body | The search query. Searchable items include a host's hostname or IPv4 address and labels.                                                                                   |
| query_id | integer | body | The saved query (if any) that will be run. The `observer_can_run` property on the query and the user's roles effect which targets are included.                            |
| selected | object  | body | The targets already selected. The object includes a `hosts` property which contains a list of host IDs, a `labels` with label IDs and/or a `teams` property with team IDs. |

#### Example

`POST /api/v1/fleet/targets`

##### Request body

```json
{
  "query": "172",
  "selected": {
    "hosts": [],
    "labels": [7]
  },
  "include_observer": true
}
```

##### Default response

```json
{
  "targets": {
    "hosts": [
      {
        "created_at": "2021-02-03T16:11:43Z",
        "updated_at": "2021-02-03T21:58:19Z",
        "id": 3,
        "detail_updated_at": "2021-02-03T21:58:10Z",
        "label_updated_at": "2021-02-03T21:58:10Z",
        "last_enrolled_at": "2021-02-03T16:11:43Z",
        "seen_time": "2021-02-03T21:58:20Z",
        "hostname": "7a2f41482833",
        "uuid": "a2064cef-0000-0000-afb9-283e3c1d487e",
        "platform": "rhel",
        "osquery_version": "4.5.1",
        "os_version": "CentOS 6.10.0",
        "build": "",
        "platform_like": "rhel",
        "code_name": "",
        "uptime": 32688000000000,
        "memory": 2086899712,
        "cpu_type": "x86_64",
        "cpu_subtype": "142",
        "cpu_brand": "Intel(R) Core(TM) i5-8279U CPU @ 2.40GHz",
        "cpu_physical_cores": 4,
        "cpu_logical_cores": 4,
        "hardware_vendor": "",
        "hardware_model": "",
        "hardware_version": "",
        "hardware_serial": "",
        "computer_name": "7a2f41482833",
        "primary_ip": "172.20.0.3",
        "primary_mac": "02:42:ac:14:00:03",
        "distributed_interval": 10,
        "config_tls_refresh": 10,
        "logger_tls_period": 10,
        "additional": {},
        "status": "offline",
        "display_text": "7a2f41482833"
      },
      {
        "created_at": "2021-02-03T16:11:43Z",
        "updated_at": "2021-02-03T21:58:19Z",
        "id": 4,
        "detail_updated_at": "2021-02-03T21:58:10Z",
        "label_updated_at": "2021-02-03T21:58:10Z",
        "last_enrolled_at": "2021-02-03T16:11:43Z",
        "seen_time": "2021-02-03T21:58:20Z",
        "hostname": "78c96e72746c",
        "uuid": "a2064cef-0000-0000-afb9-283e3c1d487e",
        "platform": "ubuntu",
        "osquery_version": "4.5.1",
        "os_version": "Ubuntu 16.4.0",
        "build": "",
        "platform_like": "debian",
        "code_name": "",
        "uptime": 32688000000000,
        "memory": 2086899712,
        "cpu_type": "x86_64",
        "cpu_subtype": "142",
        "cpu_brand": "Intel(R) Core(TM) i5-8279U CPU @ 2.40GHz",
        "cpu_physical_cores": 4,
        "cpu_logical_cores": 4,
        "hardware_vendor": "",
        "hardware_model": "",
        "hardware_version": "",
        "hardware_serial": "",
        "computer_name": "78c96e72746c",
        "primary_ip": "172.20.0.7",
        "primary_mac": "02:42:ac:14:00:07",
        "distributed_interval": 10,
        "config_tls_refresh": 10,
        "logger_tls_period": 10,
        "additional": {},
        "status": "offline",
        "display_text": "78c96e72746c"
      }
    ],
    "labels": [
      {
        "created_at": "2021-02-02T23:55:25Z",
        "updated_at": "2021-02-02T23:55:25Z",
        "id": 6,
        "name": "All Hosts",
        "description": "All hosts which have enrolled in Fleet",
        "query": "select 1;",
        "label_type": "builtin",
        "label_membership_type": "dynamic",
        "host_count": 5,
        "display_text": "All Hosts",
        "count": 5
      }
    ],
    "teams": [
      {
        "id": 1,
        "created_at": "2021-05-27T20:02:20Z",
        "name": "Client Platform Engineering",
        "description": "",
        "agent_options": null,
        "user_count": 4,
        "host_count": 2,
        "display_text": "Client Platform Engineering",
        "count": 2
      }
    ]
  },
  "targets_count": 1,
  "targets_online": 1,
  "targets_offline": 0,
  "targets_missing_in_action": 0
}
```

---

## Fleet configuration

- [Get certificate](#get-certificate)
- [Get configuration](#get-configuration)
- [Modify configuration](#modify-configuration)
- [Get enroll secrets](#get-enroll-secrets)
- [Modify enroll secrets](#modify-enroll-secrets)
- [Create invite](#create-invite)
- [List invites](#list-invites)
- [Delete invite](#delete-invite)
- [Verify invite](#verify-invite)
- [Version](#version)

The Fleet server exposes a handful of API endpoints that handle the configuration of Fleet as well as endpoints that manage invitation and enroll secret operations. All the following endpoints require prior authentication meaning you must first log in successfully before calling any of the endpoints documented below.

### Get certificate

Returns the Fleet certificate.

`GET /api/v1/fleet/config/certificate`

#### Parameters

None.

#### Example

`GET /api/v1/fleet/config/certificate`

##### Default response

`Status: 200`

```json
{
  "certificate_chain": <certificate_chain>
}
```

### Get configuration

Returns all information about the Fleet's configuration.

`GET /api/v1/fleet/config`

#### Parameters

None.

#### Example

`GET /api/v1/fleet/config`

##### Default response

`Status: 200`

```json
{
  "org_info": {
    "org_name": "fleet",
    "org_logo_url": ""
  },
  "server_settings": {
    "server_url": "https://localhost:8080",
    "live_query_disabled": false,
    "enable_analytics": true
  },
  "smtp_settings": {
    "enable_smtp": false,
    "configured": false,
    "sender_address": "",
    "server": "",
    "port": 587,
    "authentication_type": "authtype_username_password",
    "user_name": "",
    "password": "********",
    "enable_ssl_tls": true,
    "authentication_method": "authmethod_plain",
    "domain": "",
    "verify_ssl_certs": true,
    "enable_start_tls": true
  },
  "sso_settings": {
    "entity_id": "",
    "issuer_uri": "",
    "idp_image_url": "",
    "metadata": "",
    "metadata_url": "",
    "idp_name": "",
    "enable_sso": false,
    "enable_sso_idp_login": false
  },
  "host_expiry_settings": {
    "host_expiry_enabled": false,
    "host_expiry_window": 0
  },
  "host_settings": {
    "additional_queries": null
  },
  "agent_options": {
    "spec": {
      "config": {
        "options": {
          "logger_plugin": "tls",
          "pack_delimiter": "/",
          "logger_tls_period": 10,
          "distributed_plugin": "tls",
          "disable_distributed": false,
          "logger_tls_endpoint": "/api/v1/osquery/log",
          "distributed_interval": 10,
          "distributed_tls_max_attempts": 3
        },
        "decorators": {
          "load": [
            "SELECT uuid AS host_uuid FROM system_info;",
            "SELECT hostname AS hostname FROM system_info;"
          ]
        }
      },
      "overrides": {}
    }
  },
  "license": {
    "tier": "free",
    "expiration": "0001-01-01T00:00:00Z"
  },
  "vulnerability_settings": null,
  "logging": {
      "debug": false,
      "json": false,
      "result": {
          "plugin": "firehose",
          "config": {
              "region": "us-east-1",
              "status_stream": "",
              "result_stream": "result-topic"
          }
      },
      "status": {
          "plugin": "filesystem",
          "config": {
              "status_log_file": "foo_status",
              "result_log_file": "",
              "enable_log_rotation": false,
              "enable_log_compression": false
          }
      }
  }
  "license": {
    "tier": "free",
    "organization": "fleet",
    "device_count": 100,
    "expiration": "2021-12-31T19:00:00-05:00",
    "note": ""
  },
    "vulnerability_settings": {
    "databases_path": ""
  },
  "webhook_settings": {
    "host_status_webhook": {
      "enable_host_status_webhook": true,
       "destination_url": "https://server.com",
      "host_percentage": 5,
      "days_count": 7
    }
  },
  "logging": {
    "debug": false,
    "json": false,
    "result": {
        "plugin": "filesystem",
        "config": {
          "status_log_file": "/var/folders/xh/bxm1d2615tv3vrg4zrxq540h0000gn/T/osquery_status",
          "result_log_file": "/var/folders/xh/bxm1d2615tv3vrg4zrxq540h0000gn/T/osquery_result",
          "enable_log_rotation": false,
          "enable_log_compression": false
        }
      },
    "status": {
      "plugin": "filesystem",
      "config": {
        "status_log_file": "/var/folders/xh/bxm1d2615tv3vrg4zrxq540h0000gn/T/osquery_status",
        "result_log_file": "/var/folders/xh/bxm1d2615tv3vrg4zrxq540h0000gn/T/osquery_result",
        "enable_log_rotation": false,
        "enable_log_compression": false
      }
    }
  }
  "update_interval": {
    "osquery_detail": 3600000000000
  }
}
```

### Modify configuration

Modifies the Fleet's configuration with the supplied information.

`PATCH /api/v1/fleet/config`

#### Parameters

| Name                  | Type    | In   | Description                                                                                                                                                                            |
| --------------------- | ------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| org_name              | string  | body | _Organization information_. The organization name.                                                                                                                                     |
| org_logo_url          | string  | body | _Organization information_. The URL for the organization logo.                                                                                                                         |
| server_url            | string  | body | _Server settings_. The Fleet server URL.                                                                                                                                               |
| live_query_disabled   | boolean | body | _Server settings_. Whether the live query capabilities are disabled.                                                                                                                   |
| enable_smtp           | boolean | body | _SMTP settings_. Whether SMTP is enabled for the Fleet app.                                                                                                                            |
| sender_address        | string  | body | _SMTP settings_. The sender email address for the Fleet app. An invitation email is an example of the emails that may use this sender address                                          |
| server                | string  | body | _SMTP settings_. The SMTP server for the Fleet app.                                                                                                                                    |
| port                  | integer | body | _SMTP settings_. The SMTP port for the Fleet app.                                                                                                                                      |
| authentication_type   | string  | body | _SMTP settings_. The authentication type used by the SMTP server. Options include `"authtype_username_and_password"` or `"none"`                                                       |
| username_name         | string  | body | _SMTP settings_. The username used to authenticate requests made to the SMTP server.                                                                                                   |
| password              | string  | body | _SMTP settings_. The password used to authenticate requests made to the SMTP server.                                                                                                   |
| enable_ssl_tls        | boolean | body | _SMTP settings_. Whether or not SSL and TLS are enabled for the SMTP server.                                                                                                           |
| authentication_method | string  | body | _SMTP settings_. The authentication method used to make authenticate requests to SMTP server. Options include `"authmethod_plain"`, `"authmethod_cram_md5"`, and `"authmethod_login"`. |
| domain                | string  | body | _SMTP settings_. The domain for the SMTP server.                                                                                                                                       |
| verify_ssl_certs      | boolean | body | _SMTP settings_. Whether or not SSL certificates are verified by the SMTP server. Turn this off (not recommended) if you use a self-signed certificate.                                |
| enabled_start_tls     | boolean | body | _SMTP settings_. Detects if STARTTLS is enabled in your SMTP server and starts to use it.                                                                                              |
| enabled_sso           | boolean | body | _SSO settings_. Whether or not SSO is enabled for the Fleet application. If this value is true, you must also include most of the SSO settings parameters below.                       |
| entity_id             | string  | body | _SSO settings_. The required entity ID is a URI that you use to identify Fleet when configuring the identity provider.                                                                 |
| issuer_uri            | string  | body | _SSO settings_. The URI you provide here must exactly match the Entity ID field used in the identity provider configuration.                                                           |
| idp_image_url         | string  | body | _SSO settings_. An optional link to an image such as a logo for the identity provider.                                                                                                 |
| metadata              | string  | body | _SSO settings_. Metadata provided by the identity provider. Either metadata or a metadata URL must be provided.                                                                        |
| metadata_url          | string  | body | _SSO settings_. A URL that references the identity provider metadata. If available from the identity provider, this is the preferred means of providing metadata.                      |
| host_expiry_enabled   | boolean | body | _Host expiry settings_. When enabled, allows automatic cleanup of hosts that have not communicated with Fleet in some number of days.                                                  |
| host_expiry_window    | integer | body | _Host expiry settings_. If a host has not communicated with Fleet in the specified number of days, it will be removed.                                                                 |
| agent_options         | objects | body | The agent_options spec that is applied to all hosts. In Fleet 4.0.0 the `api/v1/fleet/spec/osquery_options` endpoints were removed.                                                    |
| additional_queries    | boolean | body | Whether or not additional queries are enabled on hosts.                                                                                                                                |

#### Example

`PATCH /api/v1/fleet/config`

##### Request body

```json
{
  "org_info": {
    "org_name": "Fleet Device Management",
    "org_logo_url": "https://fleetdm.com/logo.png"
  },
  "smtp_settings: {
    "enable_smtp": true,
    "server": "localhost",
    "port": "1025"
  }
}
```

##### Default response

`Status: 200`

```json
{
  "org_info": {
    "org_name": "Fleet Device Management",
    "org_logo_url": "https://fleetdm.com/logo.png"
  },
  "server_settings": {
    "server_url": "https://localhost:8080",
    "live_query_disabled": false
  },
  "smtp_settings": {
    "enable_smtp": true,
    "configured": true,
    "sender_address": "",
    "server": "localhost",
    "port": 1025,
    "authentication_type": "authtype_username_none",
    "user_name": "",
    "password": "********",
    "enable_ssl_tls": true,
    "authentication_method": "authmethod_plain",
    "domain": "",
    "verify_ssl_certs": true,
    "enable_start_tls": true
  },
  "sso_settings": {
    "entity_id": "",
    "issuer_uri": "",
    "idp_image_url": "",
    "metadata": "",
    "metadata_url": "",
    "idp_name": "",
    "enable_sso": false
  },
  "host_expiry_settings": {
    "host_expiry_enabled": false,
    "host_expiry_window": 0
  },
  "host_settings": {
    "additional_queries": null
  },
  "license": {
    "tier": "free",
    "expiration": "0001-01-01T00:00:00Z"
  },
  "license": {
    "tier": "free",
    "expiration": "0001-01-01T00:00:00Z"
  },
  "agent_options": {
    "spec": {
      "config": {
        "options": {
          "logger_plugin": "tls",
          "pack_delimiter": "/",
          "logger_tls_period": 10,
          "distributed_plugin": "tls",
          "disable_distributed": false,
          "logger_tls_endpoint": "/api/v1/osquery/log",
          "distributed_interval": 10,
          "distributed_tls_max_attempts": 3
        },
        "decorators": {
          "load": [
            "SELECT uuid AS host_uuid FROM system_info;",
            "SELECT hostname AS hostname FROM system_info;"
          ]
        }
      },
      "overrides": {}
    }
  },
    "vulnerability_settings": {
    "databases_path": ""
  },
  "webhook_settings": {
    "host_status_webhook": {
      "enable_host_status_webhook": true,
       "destination_url": "https://server.com",
      "host_percentage": 5,
      "days_count": 7
    }
  },
  "logging": {
      "debug": false,
      "json": false,
      "result": {
          "plugin": "firehose",
          "config": {
              "region": "us-east-1",
              "status_stream": "",
              "result_stream": "result-topic"
          }
      },
      "status": {
          "plugin": "filesystem",
          "config": {
              "status_log_file": "foo_status",
              "result_log_file": "",
              "enable_log_rotation": false,
              "enable_log_compression": false
          }
      }
  }
}
```

### Get enroll secrets

Returns the valid global enroll secrets.

`GET /api/v1/fleet/spec/enroll_secret`

#### Parameters

None.

#### Example

`GET /api/v1/fleet/spec/enroll_secret`

##### Default response

`Status: 200`

```json
{
  "spec": {
    "secrets": [
      {
        "secret": "fTp52/twaxBU6gIi0J6PHp8o5Sm1k1kn",
        "created_at": "2021-01-07T19:40:04Z"
      },
      {
        "secret": "bhD5kiX2J+KBgZSk118qO61ZIdX/v8On",
        "created_at": "2021-01-04T21:18:07Z"
      }
    ]
  }
}
```

### Modify enroll secrets

Replaces the active global enroll secrets with the secrets specified.

`POST /api/v1/fleet/spec/enroll_secret`

#### Parameters

| Name   | Type   | In   | Description                                                    |
| ------ | ------ | ---- | -------------------------------------------------------------- |
| secret | string | body | **Required.** The plain text string used as the enroll secret. |

#### Example

##### Request body

```json
{
  "spec": {
    "secrets": [
      {
        "secret": "fTp52/twaxBU6gIi0J6PHp8o5Sm1k1kn",
      },
    ]
  }
}
```

`POST /api/v1/fleet/spec/enroll_secret`

##### Default response

`Status: 200`

```json
{}
```

### Get enroll secret for a team

Returns the valid team enroll secret.

`GET /api/v1/fleet/teams/{id}/secrets`

#### Parameters

None.

#### Example

`GET /api/v1/fleet/teams/1/secrets`

##### Default response

`Status: 200`

```json
{
  "secrets": [
    {
      "created_at": "2021-06-16T22:05:49Z",
      "secret": "aFtH2Nq09hrvi73ErlWNQfa7M53D3rPR",
      "team_id": 1
    }
  ]
}
```

### Create invite

`POST /api/v1/fleet/invites`

#### Parameters

| Name        | Type    | In   | Description                                                                                                                                           |
| ----------- | ------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| admin       | boolean | body | **Required.** Whether or not the invited user will be granted admin privileges.                                                                       |
| email       | string  | body | **Required.** The email of the invited user. This email will receive the invitation link.                                                             |
| name        | string  | body | **Required.** The name of the invited user.                                                                                                           |
| sso_enabled | boolean | body | **Required.** Whether or not SSO will be enabled for the invited user.                                                                                |
| teams       | list    | body | _Available in Fleet Premium_ A list of the teams the user is a member of. Each item includes the team's ID and the user's role in the specified team. |

#### Example

##### Request body

```json
{
  "email": "john_appleseed@example.com",
  "name": John,
  "sso_enabled": false,
  "global_role": "admin"
  "teams": [
    {
      "id": 2,
      "role: "observer"
    },
    {
      "id": 3,
      "role: "maintainer"
    },
  ]
}
```

`POST /api/v1/fleet/invites`

##### Default response

`Status: 200`

```json
{
  "invite": {
    "created_at": "0001-01-01T00:00:00Z",
    "updated_at": "0001-01-01T00:00:00Z",
    "id": 3,
    "invited_by": 1
    "email": "john_appleseed@example.com",
    "name": "John",
    "sso_enabled": false,
    "teams": [
      {
        "id": 10,
        "created_at": "0001-01-01T00:00:00Z",
        "name": "Apples",
        "description": "",
        "agent_options": null,
        "user_count": 0,
        "host_count": 0,
        "role": "observer"
      },
      {
        "id": 14,
        "created_at": "0001-01-01T00:00:00Z",
        "name": "Best of the Best Engineering",
        "description": "",
        "agent_options": null,
        "user_count": 0,
        "host_count": 0,
        "role": "maintainer"
      }
    ]
  }
}
```

### List invites

Returns a list of the active invitations in Fleet.

`GET /api/v1/fleet/invites`

#### Parameters

| Name            | Type   | In    | Description                                                                                                                   |
| --------------- | ------ | ----- | ----------------------------------------------------------------------------------------------------------------------------- |
| order_key       | string | query | What to order results by. Can be any column in the invites table.                                                             |
| order_direction | string | query | **Requires `order_key`**. The direction of the order given the order key. Options include `asc` and `desc`. Default is `asc`. |
| query           | string | query | Search query keywords. Searchable fields include `name` and `email`.                                                          |

#### Example

`GET /api/v1/fleet/invites`

##### Default response

`Status: 200`

```json
{
  "invites": [
    {
      "created_at": "0001-01-01T00:00:00Z",
      "updated_at": "0001-01-01T00:00:00Z",
      "id": 3,
      "email": "john_appleseed@example.com",
      "name": "John",
      "sso_enabled": false,
      "global_role": "admin",
      "teams": []
    },
    {
      "created_at": "0001-01-01T00:00:00Z",
      "updated_at": "0001-01-01T00:00:00Z",
      "id": 4,
      "email": "bob_marks@example.com",
      "name": "Bob",
      "sso_enabled": false,
      "global_role": "admin",
      "teams": []
    },
  ]
}
```

### Delete invite

Delete the specified invite from Fleet.

`DELETE /api/v1/fleet/invites/{id}`

#### Parameters

| Name | Type    | In   | Description                  |
| ---- | ------- | ---- | ---------------------------- |
| id   | integer | path | **Required.** The user's id. |

#### Example

`DELETE /api/v1/fleet/invites/{id}`

##### Default response

`Status: 200`

```json
{}
```

### Verify invite

Verify the specified invite.

`GET /api/v1/fleet/invites/{token}`

#### Parameters

| Name  | Type    | In   | Description                            |
| ----- | ------- | ---- | -------------------------------------- |
| token | integer | path | **Required.** The user's invite token. |

#### Example

`GET /api/v1/fleet/invites/{token}`

##### Default response

`Status: 200`

```json
{
    "invite": {
        "created_at": "2021-01-15T00:58:33Z",
        "updated_at": "2021-01-15T00:58:33Z",
        "id": 4,
        "email": "steve@example.com",
        "name": "Steve",
        "sso_enabled": false,
        "global_role": "admin",
        "teams": []
    }
}
```

##### Not found

`Status: 404`

```json
{
    "message": "Resource Not Found",
    "errors": [
        {
            "name": "base",
            "reason": "Invite with token <token> was not found in the datastore"
        }
    ]
}
```

### Version

Get version and build information from the Fleet server.

`GET /api/v1/fleet/version`

#### Parameters

None.

#### Example

`GET /api/v1/fleet/version`

##### Default response

`Status: 200`

```json
{
  "version": "3.9.0-93-g1b67826f-dirty",
  "branch": "version",
  "revision": "1b67826fe4bf40b2f45ec53e01db9bf467752e74",
  "go_version": "go1.15.7",
  "build_date": "2021-03-27T00:28:48Z",
  "build_user": "zwass"
}
```

---

## File carving

- [List carves](#list-carves)
- [Get carve](#get-carve)
- [Get carve block](#get-carve-block)

Fleet supports osquery's file carving functionality as of Fleet 3.3.0. This allows the Fleet server to request files (and sets of files) from osquery agents, returning the full contents to Fleet.

To initiate a file carve using the Fleet API, you can use the [live query](#run-live-query) or [scheduled query](#add-scheduled-query-to-a-pack) endpoints to run a query against the `carves` table.

For more information on executing a file carve in Fleet, go to the [File carving with Fleet docs](../1-Using-Fleet/2-fleetctl-CLI.md#file-carving-with-fleet).

### List carves

Retrieves a list of the non expired carves. Carve contents remain available for 24 hours after the first data is provided from the osquery client.

`GET /api/v1/fleet/carves`

#### Parameters

None.

#### Example

`GET /api/v1/fleet/carves`

##### Default response

`Status: 200`

```json
{
  "carves": [
    {
      "id": 1,
      "created_at": "2021-02-23T22:52:01Z",
      "host_id": 7,
      "name": "macbook-pro.local-2021-02-23T22:52:01Z-fleet_distributed_query_30",
      "block_count": 1,
      "block_size": 2000000,
      "carve_size": 2048,
      "carve_id": "c6958b5f-4c10-4dc8-bc10-60aad5b20dc8",
      "request_id": "fleet_distributed_query_30",
      "session_id": "065a1dc3-40ad-441c-afff-80c2ad7dac28",
      "expired": false,
      "max_block": 0
    },
    {
      "id": 2,
      "created_at": "2021-02-23T22:53:03Z",
      "host_id": 7,
      "name": "macbook-pro.local-2021-02-23T22:53:03Z-fleet_distributed_query_31",
      "block_count": 2,
      "block_size": 2000000,
      "carve_size": 3400704,
      "carve_id": "2b9170b9-4e11-4569-a97c-2f18d18bec7a",
      "request_id": "fleet_distributed_query_31",
      "session_id": "f73922ed-40a4-4e98-a50a-ccda9d3eb755",
      "expired": false,
      "max_block": 1
    }
  ]
}
```

### Get carve

Retrieves the specified carve.

`GET /api/v1/fleet/carves/{id}`

#### Parameters

| Name | Type    | In   | Description                           |
| ---- | ------- | ---- | ------------------------------------- |
| id   | integer | path | **Required.** The desired carve's ID. |

#### Example

`GET /api/v1/fleet/carves/1`

##### Default response

`Status: 200`

```json
{
  "carve": {
    "id": 1,
    "created_at": "2021-02-23T22:52:01Z",
    "host_id": 7,
    "name": "macbook-pro.local-2021-02-23T22:52:01Z-fleet_distributed_query_30",
    "block_count": 1,
    "block_size": 2000000,
    "carve_size": 2048,
    "carve_id": "c6958b5f-4c10-4dc8-bc10-60aad5b20dc8",
    "request_id": "fleet_distributed_query_30",
    "session_id": "065a1dc3-40ad-441c-afff-80c2ad7dac28",
    "expired": false,
    "max_block": 0
  }
}
```

### Get carve block

Retrieves the specified carve block. This endpoint retrieves the data that was carved.

`GET /api/v1/fleet/carves/{id}/block/{block_id}`

#### Parameters

| Name     | Type    | In   | Description                                 |
| -------- | ------- | ---- | ------------------------------------------- |
| id       | integer | path | **Required.** The desired carve's ID.       |
| block_id | integer | path | **Required.** The desired carve block's ID. |

#### Example

`GET /api/v1/fleet/carves/1/block/0`

##### Default response

`Status: 200`

```json
{
    "data": "aG9zdHMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA..."
}
```

---

## Teams

### List teams

_Available in Fleet Premium_

`GET /api/v1/fleet/teams`

#### Parameters

| Name            | Type    | In    | Description                                                                                                                   |
| --------------- | ------- | ----- | ----------------------------------------------------------------------------------------------------------------------------- |
| page            | integer | query | Page number of the results to fetch.                                                                                          |
| per_page        | integer | query | Results per page.                                                                                                             |
| order_key       | string  | query | What to order results by. Can be any column in the `teams` table.                                                             |
| order_direction | string  | query | **Requires `order_key`**. The direction of the order given the order key. Options include `asc` and `desc`. Default is `asc`. |
| query           | string  | query | Search query keywords. Searchable fields include `name`.                                                                      |

#### Example

`GET /api/v1/fleet/teams`

##### Default response

`Status: 200`

```json
{
  "teams: [
    {
      "id": 1.
      "created_at": "2021-07-28T15:58:21Z",
      "name": "workstations",
      "description": "",
      "agent_options": {
        "config": {
          "options": {
            "logger_plugin": "tls",
            "pack_delimiter": "/",
            "logger_tls_period": 10,
            "distributed_plugin": "tls",
            "disable_distributed": false,
            "logger_tls_endpoint": "/api/v1/osquery/log",
            "distributed_interval": 10,
            "distributed_tls_max_attempts": 3
          },
          "decorators": {
            "load": [
              "SELECT uuid AS host_uuid FROM system_info;",
              "SELECT hostname AS hostname FROM system_info;"
            ]
          }
        },
        "overrides": {}
      },
      "user_count": 0,
      "host_count": 0,
      "secrets": [
        {
          "secret": "",
          "created_at": "2021-07-28T15:58:21Z",
          "team_id": 10
        }
      ]
    },
    {
      "id": 2,
      "created_at": "2021-08-05T21:41:42Z",
      "name": "servers",
      "description": "",
      "agent_options": {
        "spec": {
          "config": {
            "options": {
              "logger_plugin": "tls",
              "pack_delimiter": "/",
              "logger_tls_period": 10,
              "distributed_plugin": "tls",
              "disable_distributed": false,
              "logger_tls_endpoint": "/api/v1/osquery/log",
              "distributed_interval": 10,
              "distributed_tls_max_attempts": 3
            },
            "decorators": {
              "load": [
                "SELECT uuid AS host_uuid FROM system_info;",
                "SELECT hostname AS hostname FROM system_info;"
              ]
            }
          },
          "overrides": {}
        },
      "user_count": 0,
      "host_count": 0,
      "secrets": [
        {
          "secret": "+ncixtnZB+IE0OrbrkCLeul3U8LMVITd",
          "created_at": "2021-08-05T21:41:42Z",
          "team_id": 15
        }
      ]
    }
  ]
}
```

### Create team

_Available in Fleet Premium_

`POST /api/v1/fleet/teams`

#### Parameters

| Name | Type   | In   | Description                    |
| ---- | ------ | ---- | ------------------------------ |
| name | string | body | **Required.** The team's name. |

#### Example

`POST /api/v1/fleet/teams`

##### Request body

```json
{
  "name": "workstations"
}
```

##### Default response

`Status: 200`

```json
{
  "teams: [
    {
      "name": "workstations",
      "id": 1
      "user_ids": [],
      "host_ids": [],
      "user_count": 0,
      "host_count": 0,
      "agent_options": {
        "spec": {
          "config": {
            "options": {
              "logger_plugin": "tls",
              "pack_delimiter": "/",
              "logger_tls_period": 10,
              "distributed_plugin": "tls",
              "disable_distributed": false,
              "logger_tls_endpoint": "/api/v1/osquery/log",
              "distributed_interval": 10,
              "distributed_tls_max_attempts": 3
            },
            "decorators": {
              "load": [
                "SELECT uuid AS host_uuid FROM system_info;",
                "SELECT hostname AS hostname FROM system_info;"
              ]
            }
          },
          "overrides": {}
        }
      }
    }
  ]
}
```

### Modify team

_Available in Fleet Premium_

`PATCH /api/v1/fleet/teams/{id}`

#### Parameters

| Name     | Type   | In   | Description                                   |
| -------- | ------ | ---- | --------------------------------------------- |
| id       | string | body | **Required.** The desired team's ID.          |
| name     | string | body | The team's name.                              |
| host_ids | list   | body | A list of hosts that belong to the team.      |
| user_ids | list   | body | A list of users that are members of the team. |

#### Example (add users to a team)

`PATCH /api/v1/fleet/teams/1`

##### Request body

```json
{
  "user_ids": [1, 17, 22, 32],
}
```

##### Default response

`Status: 200`

```json
{
  "team": {
    "name": "Workstations",
    "id": 1
    "user_ids": [1, 17, 22, 32],
    "host_ids": [],
    "user_count": 4,
    "host_count": 0,
    "agent_options": {
      "spec": {
        "config": {
          "options": {
            "logger_plugin": "tls",
            "pack_delimiter": "/",
            "logger_tls_period": 10,
            "distributed_plugin": "tls",
            "disable_distributed": false,
            "logger_tls_endpoint": "/api/v1/osquery/log",
            "distributed_interval": 10,
            "distributed_tls_max_attempts": 3
          },
          "decorators": {
            "load": [
              "SELECT uuid AS host_uuid FROM system_info;",
              "SELECT hostname AS hostname FROM system_info;"
            ]
          }
        },
        "overrides": {}
      }
    }
  }
}
```

#### Example (transfer hosts to a team)

`PATCH /api/v1/fleet/teams/1`

##### Request body

```json
{
  "host_ids": [3, 6, 7, 8, 9, 20, 32, 44],
}
```

##### Default response

`Status: 200`

```json
{
  "team": {
    "name": "Workstations",
    "id": 1
    "user_ids": [1, 17, 22, 32],
    "host_ids": [3, 6, 7, 8, 9, 20, 32, 44],
    "user_count": 4,
    "host_count": 8,
    "agent_options": {
      "spec": {
        "config": {
          "options": {
            "logger_plugin": "tls",
            "pack_delimiter": "/",
            "logger_tls_period": 10,
            "distributed_plugin": "tls",
            "disable_distributed": false,
            "logger_tls_endpoint": "/api/v1/osquery/log",
            "distributed_interval": 10,
            "distributed_tls_max_attempts": 3
          },
          "decorators": {
            "load": [
              "SELECT uuid AS host_uuid FROM system_info;",
              "SELECT hostname AS hostname FROM system_info;"
            ]
          }
        },
        "overrides": {}
      }
    }
  }
}
```

#### Example (edit agent options for a team)

`PATCH /api/v1/fleet/teams/1`

##### Request body

```json
{
  "agent_options": {
    "spec": {
      "config": {
        "options": {
          "logger_plugin": "tls",
          "pack_delimiter": "/",
          "logger_tls_period": 20,
          "distributed_plugin": "tls",
          "disable_distributed": false,
          "logger_tls_endpoint": "/api/v1/osquery/log",
          "distributed_interval": 60,
          "distributed_tls_max_attempts": 3
        },
        "decorators": {
          "load": [
            "SELECT uuid AS host_uuid FROM system_info;",
            "SELECT hostname AS hostname FROM system_info;"
          ]
        }
      },
      "overrides": {}
    }
  }
}
```

##### Default response

`Status: 200`

```json
{
  "team": {
    "name": "Workstations",
    "id": 1
    "user_ids": [1, 17, 22, 32],
    "host_ids": [3, 6, 7, 8, 9, 20, 32, 44],
    "user_count": 4,
    "host_count": 8,
    "agent_options": {
      "spec": {
        "config": {
          "options": {
            "logger_plugin": "tls",
            "pack_delimiter": "/",
            "logger_tls_period": 20,
            "distributed_plugin": "tls",
            "disable_distributed": false,
            "logger_tls_endpoint": "/api/v1/osquery/log",
            "distributed_interval": 60,
            "distributed_tls_max_attempts": 3
          },
          "decorators": {
            "load": [
              "SELECT uuid AS host_uuid FROM system_info;",
              "SELECT hostname AS hostname FROM system_info;"
            ]
          }
        },
        "overrides": {}
      }
    }
  }
}
```

### Delete team

_Available in Fleet Premium_

`DELETE /api/v1/fleet/teams/{id}`

#### Parameters

| Name | Type   | In   | Description                          |
| ---- | ------ | ---- | ------------------------------------ |
| id   | string | body | **Required.** The desired team's ID. |

#### Example

`DELETE /api/v1/fleet/teams/1`

#### Default response

`Status: 200`

```json
{}
```

---

## Translator

### Translate IDs

`POST /api/v1/fleet/translate`

#### Parameters

| Name | Type  | In   | Description                              |
| ---- | ----- | ---- | ---------------------------------------- |
| list | array | body | **Required** list of items to translate. |

#### Example

`POST /api/v1/fleet/translate`

##### Request body

```json
{
  "list": [
    {
      "type": "user",
      "payload": {
        "identifier": "some@email.com"
      }
    },
    {
      "type": "label",
      "payload": {
        "identifier": "labelA"
      }
    },
    {
      "type": "team",
      "payload": {
        "identifier": "team1"
      }
    },
    {
      "type": "host",
      "payload": {
        "identifier": "host-ABC"
      }
    },
  ]
}
```

##### Default response

`Status: 200`

```json
{
  "list": [
    {
      "type": "user",
      "payload": {
        "identifier": "some@email.com",
        "id": 32
      }
    },
    {
      "type": "label",
      "payload": {
        "identifier": "labelA",
        "id": 1
      }
    },
    {
      "type": "team",
      "payload": {
        "identifier": "team1",
        "id": 22
      }
    },
    {
      "type": "host",
      "payload": {
        "identifier": "host-ABC",
        "id": 45
      }
    },
  ]
}
```

## Software

### List all software

`GET /api/v1/fleet/software`

#### Parameters

| Name                    | Type    | In    | Description                                                                                                                                                                                                                                                                                                                                 |
| ----------------------- | ------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| page                    | integer | query | Page number of the results to fetch.                                                                                                                                                                                                                                                                                                        |
| per_page                | integer | query | Results per page.                                                                                                                                                                                                                                                                                                                           |
| order_key               | string  | query | What to order results by. Can be any column in the hosts table.                                                                                                                                                                                                                                                                             |
| order_direction         | string  | query | **Requires `order_key`**. The direction of the order given the order key. Options include `asc` and `desc`. Default is `asc`.                                                                                                                                                                                                               |
| query                   | string  | query | Search query keywords. Searchable fields include `hostname`, `machine_serial`, `uuid`, and `ipv4`.                                                                                                                                                                                                                                          |
| team_id                 | integer | query | _Available in Fleet Premium_ Filters the users to only include users in the specified team.                                                                                                                                                                                                                                                 |

#### Example

`GET /api/v1/fleet/software`

##### Default response

`Status: 200`

```json
{
    “software”: [
      {
        "hosts_count": 124,
        "id": 1,
        "name": "Chrome.app",
        "version": "2.1.11",
        "source": "Application (macOS)",
        "generated_cpe": "",
        "vulnerabilities": null
      },
      {
        "hosts_count": 112,
        "id": 2,
        "name": "Figma.app",
        "version": "2.1.11",
        "source": "Application (macOS)",
        "generated_cpe": "",
        "vulnerabilities": null
      },
      {
        "hosts_count": 78,
        "id": 3,
        "name": "osquery",
        "version": "2.1.11",
        "source": "rpm_packages",
        "generated_cpe": "",
        "vulnerabilities": null
      },
      {
        "hosts_count": 78,
        "id": 4,
        "name": "osquery",
        "version": "2.1.11",
        "source": "rpm_packages",
        "generated_cpe": "",
        "vulnerabilities": null
      },
    ]
  }
}
```
