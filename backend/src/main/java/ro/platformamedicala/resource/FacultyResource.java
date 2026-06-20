package ro.platformamedicala.resource;

import jakarta.annotation.security.PermitAll;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import ro.platformamedicala.dto.FacultyResponseDTO;
import ro.platformamedicala.entities.Faculty;

import java.util.List;

@Path("/api/faculties")
@Produces(MediaType.APPLICATION_JSON)
public class FacultyResource {

    @GET
    @PermitAll
    public List<FacultyResponseDTO> list() {
        return Faculty.<Faculty>listAll().stream()
                .map(FacultyResponseDTO::fromEntity)
                .toList();
    }
}
