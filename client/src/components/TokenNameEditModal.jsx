import React from 'react';
import {
    Box,
    VStack,
    HStack,
    Button,
    Input,
    Text
} from '@chakra-ui/react';

/**
 * TokenNameEditModal Component
 * Allows inline editing of token names
 * Displays a modal overlay with text input for renaming selected tokens
 */
const TokenNameEditModal = ({
    isOpen,
    tokenId,
    editingName,
    onNameChange,
    onSave,
    onCancel
}) => {
    if (!isOpen || !tokenId) return null;

    return (
        <>
            {/* Modal backdrop */}
            <Box
                position="fixed"
                top={0}
                left={0}
                w="100%"
                h="100%"
                bg="rgba(0, 0, 0, 0.5)"
                zIndex={1001}
                onClick={onCancel}
            />

            {/* Modal content */}
            <Box
                position="fixed"
                top="50%"
                left="50%"
                transform="translate(-50%, -50%)"
                zIndex={1002}
                bg="gray.800"
                color="white"
                p={6}
                borderRadius="lg"
                border="2px solid"
                borderColor="orange.400"
                boxShadow="0 10px 25px rgba(0,0,0,0.5)"
                minW="300px"
            >
                <Text fontSize="lg" fontWeight="bold" mb={4} color="orange.400">
                    Edit Token Name
                </Text>
                <VStack spacing={4}>
                    <Input
                        value={editingName}
                        onChange={(e) => onNameChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                onSave(tokenId);
                            } else if (e.key === 'Escape') {
                                onCancel();
                            }
                        }}
                        placeholder="Enter token name"
                        bg="gray.700"
                        color="white"
                        border="1px solid"
                        borderColor="gray.600"
                        _focus={{ borderColor: 'orange.400', boxShadow: 'none' }}
                        autoFocus
                    />
                    <HStack spacing={3} w="100%">
                        <Button
                            colorScheme="orange"
                            onClick={() => onSave(tokenId)}
                            flex={1}
                        >
                            Save
                        </Button>
                        <Button
                            variant="outline"
                            onClick={onCancel}
                            flex={1}
                        >
                            Cancel
                        </Button>
                    </HStack>
                </VStack>
            </Box>
        </>
    );
};

export default TokenNameEditModal;
