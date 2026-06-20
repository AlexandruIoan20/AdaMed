package service.auth;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.NotAuthorizedException;
import org.eclipse.microprofile.jwt.JsonWebToken;
import ro.platformamedicala.entities.User;

import java.util.UUID;

@ApplicationScoped
public class CurrentUserService {

    public User require(JsonWebToken jwt) {
        String subject = jwt.getSubject();
        if (subject == null) {
            throw new NotAuthorizedException("Lipsește identitatea utilizatorului.");
        }
        User user = User.findById(UUID.fromString(subject));
        if (user == null) {
            throw new NotAuthorizedException("Utilizatorul nu există.");
        }
        return user;
    }
}
