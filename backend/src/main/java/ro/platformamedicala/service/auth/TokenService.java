package ro.platformamedicala.service.auth;

import io.smallrye.jwt.build.Jwt;
import jakarta.enterprise.context.ApplicationScoped;
import ro.platformamedicala.entities.User;

@ApplicationScoped
public class TokenService {
    public String generate(User user) {
        return Jwt.issuer("https://adamed.app/issuer")
                .upn(user.getEmail())
                .subject(user.getId().toString())
                .groups(user.getRole().name())
                .claim("username", user.getUsername())
                .sign();
    }
}
