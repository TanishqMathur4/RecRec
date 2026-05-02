import json


REGISTER_URL = "/api/auth/register"
LOGIN_URL = "/api/auth/login"
ME_URL = "/api/auth/me"

VALID_USER = {
    "email": "kim@example.com",
    "password": "securepass1",
    "display_name": "Kim",
}


def post_json(client, url, data):
    return client.post(url, data=json.dumps(data), content_type="application/json")


def register(client, data=None):
    return post_json(client, REGISTER_URL, data or VALID_USER)


# --- register ---

def test_register_success(client):
    res = register(client)
    assert res.status_code == 201
    body = res.get_json()
    assert "access_token" in body
    assert body["user"]["email"] == "kim@example.com"
    assert body["user"]["display_name"] == "Kim"
    assert "password_hash" not in body["user"]


def test_register_duplicate_email_rejected(client):
    register(client)
    res = register(client)
    assert res.status_code == 409
    assert "email" in res.get_json()["errors"]


def test_register_invalid_email_rejected(client):
    res = register(client, {**VALID_USER, "email": "notanemail"})
    assert res.status_code == 422


def test_register_short_password_rejected(client):
    res = register(client, {**VALID_USER, "password": "short"})
    assert res.status_code == 422


# --- login ---

def test_login_success(client):
    register(client)
    res = post_json(client, LOGIN_URL, {"email": "kim@example.com", "password": "securepass1"})
    assert res.status_code == 200
    body = res.get_json()
    assert "access_token" in body
    assert body["user"]["email"] == "kim@example.com"


def test_login_wrong_password_rejected(client):
    register(client)
    res = post_json(client, LOGIN_URL, {"email": "kim@example.com", "password": "wrongpass"})
    assert res.status_code == 401


def test_login_unknown_email_rejected(client):
    res = post_json(client, LOGIN_URL, {"email": "nobody@example.com", "password": "anything"})
    assert res.status_code == 401


# --- /me ---

def test_me_without_token_rejected(client):
    res = client.get(ME_URL)
    assert res.status_code == 401


def test_me_with_token_returns_user(client):
    reg = register(client)
    token = reg.get_json()["access_token"]
    res = client.get(ME_URL, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.get_json()["user"]["email"] == "kim@example.com"
