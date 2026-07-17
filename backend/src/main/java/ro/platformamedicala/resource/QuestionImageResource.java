package ro.platformamedicala.resource;

import io.quarkus.security.Authenticated;
import jakarta.annotation.security.RolesAllowed;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;
import ro.platformamedicala.dto.quiz.QuestionImageDTO;
import ro.platformamedicala.entities.Question;
import ro.platformamedicala.entities.QuestionImage;
import ro.platformamedicala.service.R2StorageService;

import java.io.IOException;
import java.nio.file.Files;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Authenticated
@Path("/api/questions/{questionId}/images")
public class QuestionImageResource {
    private static final long MAX_SIZE_BYTES = 5L * 1024 * 1024; // 5 MB
    private static final Set<String> ALLOWED_TYPES =
            Set.of("image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif");

    public final R2StorageService r2StorageService;

    public QuestionImageResource(R2StorageService r2StorageService) {
        this.r2StorageService = r2StorageService;
    }

    @POST
    @RolesAllowed("ADMIN")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    @Transactional
    public Response upload(@PathParam("questionId") UUID questionId, @RestForm("file") FileUpload file)
            throws IOException {
        Question question = Question.findById(questionId);
        if (question == null) return Response.status(Response.Status.NOT_FOUND).build();

        if (file == null) {
            return Response.status(Response.Status.BAD_REQUEST).entity("Niciun fișier trimis.").build();
        }

        String contentType = file.contentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType.toLowerCase())) {
            return Response.status(Response.Status.UNSUPPORTED_MEDIA_TYPE)
                    .entity("Tip de fișier neacceptat. Permise: PNG, JPEG, WEBP, GIF.").build();
        }

        if (file.size() > MAX_SIZE_BYTES) {
            return Response.status(413) // Payload Too Large
                    .entity("Fișierul depășește 5MB.").build();
        }

        byte[] content = Files.readAllBytes(file.uploadedFile());
        String key = r2StorageService.upload(content, file.fileName(), contentType);

        QuestionImage image = new QuestionImage();
        image.question = question;
        image.imageKey = key;
        image.imageUrl = r2StorageService.publicUrl(key);
        image.displayOrder = (int) QuestionImage.count("question.id", questionId); // adăugare la coadă
        image.persist();

        return Response.status(Response.Status.CREATED).entity(QuestionImageDTO.fromEntity(image)).build();
    }

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public List<QuestionImageDTO> list(@PathParam("questionId") UUID questionId) {
        List<QuestionImage> images = QuestionImage.list("question.id = ?1 order by displayOrder", questionId);
        return images.stream().map(QuestionImageDTO::fromEntity).toList();
    }

    @DELETE
    @RolesAllowed("ADMIN")
    @Path("/{imageId}")
    @Transactional
    public Response delete(@PathParam("imageId") UUID imageId) {
        QuestionImage image = QuestionImage.findById(imageId);
        if (image == null) return Response.status(Response.Status.NOT_FOUND).build();

        r2StorageService.delete(image.imageKey);
        image.delete();

        return Response.noContent().build();
    }
}
