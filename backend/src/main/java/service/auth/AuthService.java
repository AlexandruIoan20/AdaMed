package service.auth;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.NotAuthorizedException;
import ro.platformamedicala.dto.auth.LoginRequestDTO;
import ro.platformamedicala.dto.auth.RegisterRequestDTO;
import ro.platformamedicala.entities.Faculty;
import ro.platformamedicala.entities.User;

@ApplicationScoped
public class AuthService {
    private final PasswordService passwordService;
    private final TokenService tokenService;

    public AuthService(PasswordService passwordService, TokenService tokenService) {
        this.passwordService = passwordService;
        this.tokenService = tokenService;
    }

    @Transactional
    public AuthResult register(RegisterRequestDTO request) {
        if(User.find("email", request.email).firstResultOptional().isPresent()) throw new BadRequestException("Email already in use.");
        if(User.find("username", request.username).firstResultOptional().isPresent()) throw new BadRequestException("Username already in use.");

        Faculty faculty = Faculty.<Faculty>findByIdOptional(request.facultyId)
                .orElseThrow(() -> new BadRequestException("Invalid facultyId"));

        User user = new User();
        user.setUsername(request.username);
        user.setFirstName(request.firstName);
        user.setLastName(request.lastName);
        user.setEmail(request.email);
        user.setPasswordHash(passwordService.hash(request.password));
        user.setFaculty(faculty);
        user.setYearOfStudy(request.yearOfStudy);

        user.persist();

        String token = tokenService.generate(user);
        return new AuthResult(user, token);
    }

    public AuthResult login(LoginRequestDTO request) {
        User user = User.<User>find("email", request.email)
                .firstResultOptional()
                .orElseThrow(() -> new NotAuthorizedException("Invalid credentials"));

        if(!passwordService.verify(request.password, user.getPasswordHash())) throw new NotAuthorizedException("Invalid credenntials");

        String token = tokenService.generate(user);
        return new AuthResult(user, token);
    }

    public record AuthResult(User user, String token) {}
}
