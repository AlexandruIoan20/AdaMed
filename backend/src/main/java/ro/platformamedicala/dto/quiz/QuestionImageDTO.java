package ro.platformamedicala.dto.quiz;

import ro.platformamedicala.entities.QuestionImage;

import java.util.UUID;

// Răspuns pentru imaginile unei grile. Nu expunem entitatea direct
// (are `question` LAZY -> risc de LazyInitializationException / serializare graf).
public record QuestionImageDTO(UUID id, String imageUrl, int displayOrder) {
    public static QuestionImageDTO fromEntity(QuestionImage image) {
        return new QuestionImageDTO(image.id, image.imageUrl, image.displayOrder);
    }
}
