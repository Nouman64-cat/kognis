from passlib.context import CryptContext

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_secret(plain: str) -> str:
    return _pwd.hash(plain)


def verify_secret(plain: str, hashed: str) -> bool:
    return _pwd.verify(plain, hashed)
