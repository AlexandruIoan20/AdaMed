package ro.platformamedicala.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.util.UUID;

@ApplicationScoped
public class R2StorageService {
    @Inject
    S3Client s3Client;

    @ConfigProperty(name = "r2.bucket.name")
    String bucketName;

    @ConfigProperty(name = "r2.public.base-url")
    String publicBaseUrl;

    public String upload(byte[] content, String originalName, String contentType) {
        String extension = originalName != null && originalName.contains(".") ?
                originalName.substring(originalName.lastIndexOf('.')) :
                "";

        String key = "questions/" + UUID.randomUUID() + extension;

        s3Client.putObject(
                PutObjectRequest.builder()
                        .bucket(bucketName)
                        .key(key)
                        .contentType(contentType)
                        .build(),
                RequestBody.fromBytes(content)
        );

        return key;
    }

    public void delete(String key) {
        s3Client.deleteObject(
                DeleteObjectRequest.builder()
                        .bucket(bucketName)
                        .key(key)
                        .build()
        );
    }

    public String publicUrl(String key) {
        return publicBaseUrl +  "/" + key;
    }
}
