import React from 'react';
import {
    Box,
    VStack,
    HStack,
    Card,
    CardBody,
    Avatar,
    Button,
    Text,
    IconButton,
    Input
} from '@chakra-ui/react';
import { IoChevronDown, IoChevronUp } from 'react-icons/io5';

/**
 * CharacterSidebar Component
 * Displays and manages a list of user's characters for the campaign
 * Allows adding/removing characters from the current map and editing names
 */
const CharacterSidebar = ({
    characters,
    currentMap,
    editingToken,
    editingName,
    onEditingTokenChange,
    onEditingNameChange,
    onSaveTokenName,
    onCancelEditingTokenName,
    onCharacterImageClick,
    onAddCharacterToMap,
    onRemoveCharacterFromMap,
    isCollapsed = false,
    onCollapseToggle
}) => {
    return (
        <Box>
            <HStack 
                spacing={2} 
                mb={3} 
                cursor="pointer" 
                onClick={onCollapseToggle}
                _hover={{ color: 'orange.400' }}
                transition="color 0.2s"
            >
                <Text fontSize="lg" fontWeight="semibold" color="gray.200">
                    Your Characters
                </Text>
                <IconButton
                    icon={isCollapsed ? <IoChevronDown /> : <IoChevronUp />}
                    size="xs"
                    variant="ghost"
                    color="gray.400"
                    aria-label={isCollapsed ? "Expand characters" : "Collapse characters"}
                    _hover={{ color: 'orange.400' }}
                />
            </HStack>
            {!isCollapsed && (
                <VStack spacing={3} align="stretch">
                    {characters.length > 0 ? (
                        characters.map((character, index) => {
                            // Check if character is already on current map
                            const isOnCurrentMap = currentMap?.characterInstances?.some(
                                instance => instance.characterId._id === character._id || instance.characterId === character._id
                            );
                            
                            return (
                                <Card key={character._id || index} bg="gray.700" borderColor="gray.600">
                                    <CardBody>
                                        <HStack spacing={3}>
                                            <Avatar
                                                size="md"
                                                src={character.assetId?.url}
                                                bg="orange.400"
                                                color="white"
                                                name={character.name || `Character ${index + 1}`}
                                                cursor="pointer"
                                                _hover={{ 
                                                    opacity: 0.8,
                                                    transform: "scale(1.05)",
                                                    transition: "all 0.2s"
                                                }}
                                                onClick={() => onCharacterImageClick(character)}
                                                title="Click to update character image"
                                            />
                                            <Box flex={1}>
                                                {editingToken === character._id ? (
                                                    <HStack spacing={2}>
                                                        <Input
                                                            value={editingName}
                                                            onChange={(e) => onEditingNameChange(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    onSaveTokenName(`char_${character._id}`);
                                                                } else if (e.key === 'Escape') {
                                                                    onCancelEditingTokenName();
                                                                }
                                                            }}
                                                            size="sm"
                                                            bg="gray.600"
                                                            color="white"
                                                            border="1px solid"
                                                            borderColor="orange.400"
                                                            _focus={{ borderColor: 'orange.500', boxShadow: 'none' }}
                                                            autoFocus
                                                        />
                                                        <Button
                                                            size="xs"
                                                            colorScheme="orange"
                                                            onClick={() => onSaveTokenName(`char_${character._id}`)}
                                                        >
                                                            Save
                                                        </Button>
                                                        <Button
                                                            size="xs"
                                                            variant="ghost"
                                                            onClick={onCancelEditingTokenName}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </HStack>
                                                ) : (
                                                    <Text 
                                                        color="white" 
                                                        fontWeight="medium"
                                                        cursor="pointer"
                                                        _hover={{ color: 'orange.400' }}
                                                        onClick={() => onEditingTokenChange(character)}
                                                        title="Click to edit name"
                                                    >
                                                        {character.name || `Character ${index + 1}`}
                                                    </Text>
                                                )}
                                                <Text color="gray.400" fontSize="sm">
                                                    Level {character.level} • {isOnCurrentMap ? 'On Map' : 'Not on Map'}
                                                </Text>
                                            </Box>
                                            {currentMap && (
                                                <Box>
                                                    {isOnCurrentMap ? (
                                                        <Button
                                                            size="sm"
                                                            colorScheme="red"
                                                            variant="outline"
                                                            onClick={() => onRemoveCharacterFromMap(character._id)}
                                                        >
                                                            Remove
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            colorScheme="orange"
                                                            onClick={() => onAddCharacterToMap(character._id)}
                                                        >
                                                            Add to Map
                                                        </Button>
                                                    )}
                                                </Box>
                                            )}
                                        </HStack>
                                    </CardBody>
                                </Card>
                            );
                        })
                    ) : (
                        <Card bg="gray.700" borderColor="orange.400" borderWidth="2px" borderStyle="dashed">
                            <CardBody py={6}>
                                <VStack spacing={3}>
                                    <Text fontSize="3xl" color="orange.400">
                                        🎭
                                    </Text>
                                    <Text color="orange.400" fontWeight="bold" textAlign="center">
                                        No Characters Yet
                                    </Text>
                                    <Text color="gray.300" fontSize="sm" textAlign="center" lineHeight="1.5">
                                        Add your character to the map by dragging an image file from your computer onto the center area of the game canvas
                                    </Text>
                                    <Box bg="gray.600" px={3} py={2} borderRadius="md" w="full">
                                        <Text color="gray.200" fontSize="xs" fontWeight="medium" mb={1}>
                                            Quick Tips:
                                        </Text>
                                        <Text color="gray.400" fontSize="xs" mb={1}>
                                            • Drop in center area → Character token
                                        </Text>
                                        <Text color="gray.400" fontSize="xs" mb={1}>
                                            • Drop near edges → Background image
                                        </Text>
                                        <Text color="gray.400" fontSize="xs">
                                            • Supports JPG, PNG, and GIF files
                                        </Text>
                                    </Box>
                                </VStack>
                            </CardBody>
                        </Card>
                    )}
                </VStack>
            )}
        </Box>
    );
};

export default CharacterSidebar;
