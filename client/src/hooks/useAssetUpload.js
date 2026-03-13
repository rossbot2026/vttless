import { useCallback } from 'react';
import { useToast } from '@chakra-ui/react';
import { api } from '../common/axiosPrivate.js';

/**
 * useAssetUpload Hook
 * Consolidates asset upload logic used across multiple components
 * Handles presigned URL generation, file upload, and confirmation
 */
export const useAssetUpload = () => {
    const toast = useToast();

    /**
     * Upload an asset (background, token, etc.) to S3
     * Returns the assetId for further use
     */
    const uploadAsset = useCallback(async (file, assetType, campaignId) => {
        try {
            // Get presigned URL
            const { data: { uploadUrl, assetId } } = await api.post(
                '/assets/upload-url',
                {
                    fileName: file.name,
                    fileType: file.type,
                    assetType,
                    campaignId
                }
            );

            // Upload file directly to S3
            await api.put(uploadUrl, file, {
                headers: {
                    'Content-Type': file.type
                }
            });

            // Confirm upload
            await api.post(
                '/assets/confirm-upload',
                { assetId }
            );

            return assetId;
        } catch (error) {
            toast({
                title: "Upload failed",
                description: error.message,
                status: "error"
            });
            throw error;
        }
    }, [toast]);

    /**
     * Load a downloadable URL for an asset
     */
    const loadAssetUrl = useCallback(async (assetId) => {
        try {
            const { data: { downloadUrl } } = await api.get(
                `/assets/download/${assetId}`
            );
            return downloadUrl;
        } catch (error) {
            console.error('Error loading asset:', error);
            throw error;
        }
    }, []);

    return {
        uploadAsset,
        loadAssetUrl
    };
};
