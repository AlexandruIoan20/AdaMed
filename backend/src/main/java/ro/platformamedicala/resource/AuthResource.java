package ro.platformamedicala.resource;

import io.quarkus.security.Authenticated;
import jakarta.annotation.security.PermitAll;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.NewCookie;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.jwt.JsonWebToken;
import ro.platformamedicala.dto.auth.LoginRequestDTO;
import ro.platformamedicala.dto.auth.RegisterRequestDTO;
import ro.platformamedicala.dto.auth.UserResponseDTO;
import ro.platformamedicala.entities.User;
import service.auth.AuthService;

import java.util.UUID;

@Path("/api/auth")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class AuthResource {
    private static final String COOKIE_NAME = "access_token";
    private static final int COOKIE_MAX_AGE_SECONDS = 7200;

    private final AuthService authService;

    @Inject
    JsonWebToken jwt;

    // Dev: false (permite cookie-ul pe http://localhost, fara TLS).
    // Productie: TREBUIE true - vezi %prod.auth.cookie.secure din application.properties.
    @ConfigProperty(name = "auth.cookie.secure")
    boolean cookieSecure;

    public AuthResource(AuthService authService) {
        this.authService = authService;
    }

    @POST
    @Path("/register")
    @PermitAll
    public Response register(@Valid RegisterRequestDTO request) {
        AuthService.AuthResult result = authService.register(request);
        return Response.ok(UserResponseDTO.fromEntity(result.user()))
                .cookie(buildAuthCookie(result.token()))
                .build();
    }

    @POST
    @Path("/login")
    @PermitAll
    public Response login(@Valid LoginRequestDTO request) {
        AuthService.AuthResult result = authService.login(request);
        return Response.ok(UserResponseDTO.fromEntity(result.user()))
                .cookie(buildAuthCookie(result.token()))
                .build();
    }

    @POST
    @Path("/logout")
    @PermitAll
    public Response logout() {
        return Response.ok().cookie(buildExpiredCookie()).build();
    }

    @GET
    @Path("/me")
    @Authenticated
    public Response me() {
        UUID userId = UUID.fromString(jwt.getSubject());
        User user = User.findById(userId);
        return Response.ok(UserResponseDTO.fromEntity(user)).build();
    }

    private NewCookie buildAuthCookie(String token) {
        return new NewCookie.Builder(COOKIE_NAME)
                .value(token)
                .path("/")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(NewCookie.SameSite.STRICT)
                .maxAge(COOKIE_MAX_AGE_SECONDS)
                .build();
    }

    private NewCookie buildExpiredCookie() {
        return new NewCookie.Builder(COOKIE_NAME)
                .value("")
                .path("/")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(NewCookie.SameSite.STRICT)
                .maxAge(0)
                .build();
    }
    
}
