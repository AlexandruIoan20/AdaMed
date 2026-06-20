package ro.platformamedicala.resource;

import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;
import ro.platformamedicala.dto.quiz.AnswerResultDTO;
import ro.platformamedicala.dto.quiz.QuestionDTO;
import ro.platformamedicala.dto.quiz.SessionResultDTO;
import ro.platformamedicala.dto.quiz.StartSessionRequestDTO;
import ro.platformamedicala.dto.quiz.SubmitAnswerRequestDTO;
import ro.platformamedicala.entities.User;
import service.auth.CurrentUserService;
import service.quiz.QuizSessionService;

import java.util.UUID;

@Path("/api/quiz")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class QuizResource {
    private final QuizSessionService quizSessionService;
    private final CurrentUserService currentUserService;

    @Inject
    JsonWebToken jwt;

    public QuizResource(QuizSessionService quizSessionService, CurrentUserService currentUserService) {
        this.quizSessionService = quizSessionService;
        this.currentUserService = currentUserService;
    }

    @POST
    @Path("/sessions")
    public SessionResultDTO startSession(@Valid StartSessionRequestDTO request) {
        User user = currentUserService.require(jwt);
        return quizSessionService.startSession(user, request.subjectId);
    }

    @GET
    @Path("/sessions/{sessionId}")
    public SessionResultDTO getSession(@PathParam("sessionId") UUID sessionId) {
        User user = currentUserService.require(jwt);
        return quizSessionService.getSession(user, sessionId);
    }

    @GET
    @Path("/sessions/{sessionId}/next")
    public Response nextQuestion(@PathParam("sessionId") UUID sessionId) {
        User user = currentUserService.require(jwt);
        QuestionDTO next = quizSessionService.getNextQuestion(user, sessionId);
        if (next == null) {
            return Response.noContent().build();
        }
        return Response.ok(next).build();
    }

    @POST
    @Path("/sessions/{sessionId}/answers")
    public AnswerResultDTO submitAnswer(@PathParam("sessionId") UUID sessionId,
                                        @Valid SubmitAnswerRequestDTO request) {
        User user = currentUserService.require(jwt);
        return quizSessionService.submitAnswer(user, sessionId, request);
    }

    @POST
    @Path("/sessions/{sessionId}/finish")
    public SessionResultDTO finishSession(@PathParam("sessionId") UUID sessionId) {
        User user = currentUserService.require(jwt);
        return quizSessionService.finishSession(user, sessionId);
    }
}
