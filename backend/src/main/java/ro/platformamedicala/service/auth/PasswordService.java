package ro.platformamedicala.service.auth;

import io.quarkus.elytron.security.common.BcryptUtil;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class PasswordService {
    public String hash(String rawPassword) {
        return BcryptUtil.bcryptHash(rawPassword);
    }

    public boolean verify(String rawPassword, String hash) {
        return BcryptUtil.matches(rawPassword, hash);
    }
}
