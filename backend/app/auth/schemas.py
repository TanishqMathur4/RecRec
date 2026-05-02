from dataclasses import dataclass


@dataclass
class RegisterSchema:
    email: str
    password: str
    display_name: str

    @classmethod
    def from_dict(cls, data: dict) -> "RegisterSchema":
        errors = {}
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""
        display_name = (data.get("display_name") or "").strip()

        if not email or "@" not in email:
            errors["email"] = "Valid email is required."
        if len(password) < 8:
            errors["password"] = "Password must be at least 8 characters."
        if not display_name:
            errors["display_name"] = "Display name is required."

        if errors:
            raise ValueError(errors)

        return cls(email=email, password=password, display_name=display_name)


@dataclass
class LoginSchema:
    email: str
    password: str

    @classmethod
    def from_dict(cls, data: dict) -> "LoginSchema":
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""

        if not email or not password:
            raise ValueError({"email": "Email and password are required."})

        return cls(email=email, password=password)
