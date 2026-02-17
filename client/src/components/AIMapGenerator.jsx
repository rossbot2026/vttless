// client/src/components/AIMapGenerator.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    Button,
    VStack,
    HStack,
    FormControl,
    FormLabel,
    Input,
    Textarea,
    Select,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    NumberIncrementStepper,
    NumberDecrementStepper,
    useToast,
    Text,
    Box,
    Image,
    Spinner,
    Progress,
    Badge,
    Alert,
    AlertIcon,
    Switch,
    Grid,
    GridItem,
    Card,
    CardBody,
    Divider
} from '@chakra-ui/react';
import { FiMap, FiGrid, FiZap, FiCheck } from 'react-icons/fi';
import { generateAIMap, checkGenerationStatus, getAIModels, getMapDownloadUrl } from '../providers/MapService';

const GENERATION_COST = 0.015;

const GRID_SIZE_PRESETS = [
    { label: 'Small (30×20)', width: 30, height: 20 },
    { label: 'Medium (40×30)', width: 40, height: 30 },
    { label: 'Large (50×40)', width: 50, height: 40 },
    { label: 'Extra Large (60×45)', width: 60, height: 45 },
    { label: 'Dungeon (30×30)', width: 30, height: 30 },
    { label: 'Epic (80×60)', width: 80, height: 60 },
];

const STYLE_OPTIONS = [
    { value: 'fantasy', label: 'Fantasy', description: 'Medieval castles, forests, villages' },
    { value: 'scifi', label: 'Sci-Fi', description: 'Space stations, alien planets, cyberpunk' },
    { value: 'modern', label: 'Modern', description: 'Urban environments, offices, warehouses' },
    { value: 'dungeon', label: 'Dungeon', description: 'Caves, tombs, labyrinths, ruins' },
];

const AIMapGenerator = ({ isOpen, onClose, campaignId, onMapGenerated }) => {
    const [formData, setFormData] = useState({
        name: '',
        prompt: '',
        style: 'fantasy',
        gridWidth: 40,
        gridHeight: 30,
        gridSize: 40
    });
    const [selectedModel, setSelectedModel] = useState('');
    const [aiModels, setAiModels] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [generationStatus, setGenerationStatus] = useState(null);
    const [generatedImage, setGeneratedImage] = useState(null);
    const [showGrid, setShowGrid] = useState(true);
    // Store current map ID for potential future use
    // eslint-disable-next-line no-unused-vars
    const [currentMapId, setCurrentMapId] = useState(null);
    const [error, setError] = useState(null);
    
    const pollIntervalRef = useRef(null);
    const toast = useToast();

    // Fetch available AI models on mount
    useEffect(() => {
        const fetchModels = async () => {
            try {
                const result = await getAIModels();
                if (result.success && result.models) {
                    setAiModels(result.models);
                    // Set default to first model
                    if (result.models.length > 0) {
                        setSelectedModel(result.models[0].id);
                    }
                }
            } catch (err) {
                console.error('Error fetching AI models:', err);
                // Fallback to default model if fetch fails
                setSelectedModel('black-forest-labs/flux.2-klein-4b');
            }
        };
        fetchModels();
    }, []);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setFormData({
                name: '',
                prompt: '',
                style: 'fantasy',
                gridWidth: 40,
                gridHeight: 30,
                gridSize: 40
            });
            setGenerationStatus(null);
            setGeneratedImage(null);
            setError(null);
            setCurrentMapId(null);
            setShowGrid(true);
            // Set default model if available
            if (aiModels.length > 0 && !selectedModel) {
                setSelectedModel(aiModels[0].id);
            }
        }
    }, [isOpen, aiModels, selectedModel]);

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, []);

    const handlePresetChange = (preset) => {
        setFormData(prev => ({
            ...prev,
            gridWidth: preset.width,
            gridHeight: preset.height
        }));
    };

    const handleGenerate = async () => {
        if (!formData.name.trim()) {
            toast({
                title: 'Map name required',
                description: 'Please enter a name for your map',
                status: 'warning',
                duration: 3000,
            });
            return;
        }
        if (!formData.prompt.trim()) {
            toast({
                title: 'Prompt required',
                description: 'Please describe the map you want to generate',
                status: 'warning',
                duration: 3000,
            });
            return;
        }

        setIsSubmitting(true);
        setError(null);
        setGenerationStatus('processing');

        try {
            const result = await generateAIMap(
                formData.name,
                formData.prompt,
                formData.style,
                formData.gridWidth,
                formData.gridHeight,
                formData.gridSize,
                campaignId,
                selectedModel
            );

            if (result.success && result.mapId) {
                setCurrentMapId(result.mapId);
                setGenerationStatus('processing');
                
                // Start polling for status
                startPolling(result.mapId);
                
                toast({
                    title: 'Generation started',
                    description: 'Your map is being generated. This may take a minute.',
                    status: 'info',
                    duration: 3000,
                });
            } else {
                throw new Error(result.message || 'Failed to start map generation');
            }
        } catch (err) {
            console.error('Generation error:', err);
            setError(err.response?.data?.message || err.message || 'Failed to generate map');
            setGenerationStatus('failed');
            setIsSubmitting(false);
        }
    };

    const startPolling = (mapId) => {
        pollIntervalRef.current = setInterval(async () => {
            try {
                const status = await checkGenerationStatus(mapId);
                
                if (status.status === 'completed') {
                    clearInterval(pollIntervalRef.current);
                    
                    // Fetch pre-signed download URL
                    try {
                        const { downloadUrl } = await getMapDownloadUrl(mapId);
                        setGeneratedImage(downloadUrl);
                    } catch (urlError) {
                        console.error('Error fetching download URL:', urlError);
                        // Fallback to direct URL if signed URL fails
                        setGeneratedImage(status.imageUrl);
                    }
                    
                    setGenerationStatus('completed');
                    setIsSubmitting(false);
                    
                    toast({
                        title: 'Map generated successfully!',
                        status: 'success',
                        duration: 3000,
                    });
                } else if (status.status === 'failed') {
                    clearInterval(pollIntervalRef.current);
                    setError(status.error || 'Map generation failed');
                    setGenerationStatus('failed');
                    setIsSubmitting(false);
                    
                    toast({
                        title: 'Generation failed',
                        description: status.error || 'An error occurred during generation',
                        status: 'error',
                        duration: 5000,
                    });
                }
                // Continue polling if status is 'processing'
            } catch (err) {
                console.error('Status check error:', err);
                // Continue polling on network errors
            }
        }, 2000);
    };

    const handleSaveMap = () => {
        if (onMapGenerated) {
            onMapGenerated();
        }
        handleClose();
    };

    const handleClose = () => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
        }
        onClose();
    };

    // Calculate grid overlay style
    const gridOverlayStyle = {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.3) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.3) 1px, transparent 1px)
        `,
        backgroundSize: `${formData.gridSize}px ${formData.gridSize}px`,
        pointerEvents: 'none',
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} size="4xl" closeOnOverlayClick={!isSubmitting}>
            <ModalOverlay />
            <ModalContent maxWidth="900px">
                <ModalHeader>
                    <HStack spacing={2}>
                        <FiMap />
                        <Text>Generate AI Battle Map</Text>
                    </HStack>
                </ModalHeader>
                <ModalCloseButton isDisabled={isSubmitting} />
                
                <ModalBody>
                    <Grid templateColumns="1fr 1fr" gap={6}>
                        {/* Left Column - Form */}
                        <GridItem>
                            <VStack spacing={4} align="stretch">
                                <FormControl isRequired>
                                    <FormLabel>Map Name</FormLabel>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Enter map name"
                                        isDisabled={isSubmitting}
                                    />
                                </FormControl>

                                <FormControl isRequired>
                                    <FormLabel>Map Description</FormLabel>
                                    <Textarea
                                        value={formData.prompt}
                                        onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                                        placeholder="Describe your map... (e.g., 'A dark underground cavern with glowing mushrooms, stalactites, and a underground lake')"
                                        rows={4}
                                        isDisabled={isSubmitting}
                                    />
                                    <Text fontSize="xs" color="gray.500" mt={1}>
                                        Be specific about elements, atmosphere, and features
                                    </Text>
                                </FormControl>

                                <FormControl isRequired>
                                    <FormLabel>Style</FormLabel>
                                    <Select
                                        value={formData.style}
                                        onChange={(e) => setFormData({ ...formData, style: e.target.value })}
                                        isDisabled={isSubmitting}
                                    >
                                        {STYLE_OPTIONS.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label} - {option.description}
                                            </option>
                                        ))}
                                    </Select>
                                </FormControl>

                                <FormControl isRequired>
                                    <FormLabel>AI Model</FormLabel>
                                    <Select
                                        value={selectedModel}
                                        onChange={(e) => setSelectedModel(e.target.value)}
                                        isDisabled={isSubmitting}
                                    >
                                        {aiModels.map(model => (
                                            <option key={model.id} value={model.id}>
                                                {model.name} (${model.pricePerImage.toFixed(3)}/image)
                                            </option>
                                        ))}
                                    </Select>
                                    <Text fontSize="xs" color="gray.500" mt={1}>
                                        {aiModels.find(m => m.id === selectedModel)?.description || 'Select an AI model'}
                                    </Text>
                                </FormControl>

                                <Divider />

                                <FormControl>
                                    <FormLabel>Grid Size Preset</FormLabel>
                                    <Select
                                        onChange={(e) => {
                                            const preset = GRID_SIZE_PRESETS.find(p => p.label === e.target.value);
                                            if (preset) handlePresetChange(preset);
                                        }}
                                        placeholder="Select a preset"
                                        isDisabled={isSubmitting}
                                    >
                                        {GRID_SIZE_PRESETS.map(preset => (
                                            <option key={preset.label} value={preset.label}>
                                                {preset.label}
                                            </option>
                                        ))}
                                    </Select>
                                </FormControl>

                                <HStack spacing={4}>
                                    <FormControl>
                                        <FormLabel>Width</FormLabel>
                                        <NumberInput
                                            value={formData.gridWidth}
                                            onChange={(value) => setFormData({ ...formData, gridWidth: parseInt(value) || 0 })}
                                            min={10}
                                            max={100}
                                            isDisabled={isSubmitting}
                                        >
                                            <NumberInputField />
                                            <NumberInputStepper>
                                                <NumberIncrementStepper />
                                                <NumberDecrementStepper />
                                            </NumberInputStepper>
                                        </NumberInput>
                                    </FormControl>

                                    <FormControl>
                                        <FormLabel>Height</FormLabel>
                                        <NumberInput
                                            value={formData.gridHeight}
                                            onChange={(value) => setFormData({ ...formData, gridHeight: parseInt(value) || 0 })}
                                            min={10}
                                            max={100}
                                            isDisabled={isSubmitting}
                                        >
                                            <NumberInputField />
                                            <NumberInputStepper>
                                                <NumberIncrementStepper />
                                                <NumberDecrementStepper />
                                            </NumberInputStepper>
                                        </NumberInput>
                                    </FormControl>

                                    <FormControl>
                                        <FormLabel>Cell Size</FormLabel>
                                        <NumberInput
                                            value={formData.gridSize}
                                            onChange={(value) => setFormData({ ...formData, gridSize: parseInt(value) || 0 })}
                                            min={20}
                                            max={100}
                                            isDisabled={isSubmitting}
                                        >
                                            <NumberInputField />
                                            <NumberInputStepper>
                                                <NumberIncrementStepper />
                                                <NumberDecrementStepper />
                                            </NumberInputStepper>
                                        </NumberInput>
                                    </FormControl>
                                </HStack>

                                {/* Cost Display */}
                                <Alert status="info" borderRadius="md">
                                    <AlertIcon />
                                    <Box>
                                        <Text fontWeight="medium">
                                            Generation Cost: ~${(aiModels.find(m => m.id === selectedModel)?.pricePerImage || 0.015).toFixed(3)}
                                        </Text>
                                        <Text fontSize="xs">
                                            Using {aiModels.find(m => m.id === selectedModel)?.name || 'FLUX.2 Klein'} AI model
                                        </Text>
                                    </Box>
                                </Alert>

                                {/* Error Display */}
                                {error && (
                                    <Alert status="error" borderRadius="md">
                                        <AlertIcon />
                                        <Text>{error}</Text>
                                    </Alert>
                                )}

                                {/* Status Indicator */}
                                {generationStatus === 'processing' && (
                                    <Box>
                                        <HStack mb={2}>
                                            <Spinner size="sm" />
                                            <Text fontSize="sm">Generating map...</Text>
                                        </HStack>
                                        <Progress size="xs" isIndeterminate colorScheme="blue" borderRadius="full" />
                                    </Box>
                                )}

                                {generationStatus === 'completed' && (
                                    <Alert status="success" borderRadius="md">
                                        <AlertIcon />
                                        <HStack>
                                            <FiCheck />
                                            <Text>Map generated successfully!</Text>
                                        </HStack>
                                    </Alert>
                                )}
                            </VStack>
                        </GridItem>

                        {/* Right Column - Preview */}
                        <GridItem>
                            <VStack spacing={4} align="stretch">
                                <Text fontWeight="medium" fontSize="sm">Preview</Text>
                                
                                <Box
                                    border="2px dashed"
                                    borderColor={generatedImage ? "green.300" : "gray.300"}
                                    borderRadius="md"
                                    bg="gray.50"
                                    minHeight="300px"
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                    position="relative"
                                    overflow="hidden"
                                >
                                    {isSubmitting && !generatedImage ? (
                                        <VStack spacing={3}>
                                            <Spinner size="xl" color="blue.500" thickness="4px" />
                                            <Text color="gray.500">Generating your map...</Text>
                                            <Text fontSize="xs" color="gray.400">
                                                This usually takes 10-30 seconds
                                            </Text>
                                        </VStack>
                                    ) : generatedImage ? (
                                        <Box position="relative" width="100%" height="100%">
                                            <Image
                                                src={generatedImage}
                                                alt="Generated map"
                                                objectFit="contain"
                                                maxH="400px"
                                                width="100%"
                                            />
                                            {showGrid && <Box style={gridOverlayStyle} />}
                                        </Box>
                                    ) : (
                                        <VStack spacing={2} color="gray.400">
                                            <FiMap size={48} />
                                            <Text>Map preview will appear here</Text>
                                        </VStack>
                                    )}
                                </Box>

                                {/* Grid Toggle */}
                                {generatedImage && (
                                    <HStack justify="space-between">
                                        <HStack>
                                            <FiGrid />
                                            <Text fontSize="sm">Show Grid Overlay</Text>
                                        </HStack>
                                        <Switch
                                            isChecked={showGrid}
                                            onChange={(e) => setShowGrid(e.target.checked)}
                                            colorScheme="blue"
                                        />
                                    </HStack>
                                )}

                                {/* Grid Info */}
                                <Card size="sm">
                                    <CardBody>
                                        <HStack justify="space-between" wrap="wrap" gap={2}>
                                            <Badge colorScheme="blue">
                                                {formData.gridWidth}×{formData.gridHeight} grid
                                            </Badge>
                                            <Badge colorScheme="purple">
                                                {formData.gridSize}px cells
                                            </Badge>
                                            <Badge colorScheme="teal">
                                                {formData.style}
                                            </Badge>
                                        </HStack>
                                    </CardBody>
                                </Card>
                            </VStack>
                        </GridItem>
                    </Grid>
                </ModalBody>

                <ModalFooter>
                    <HStack spacing={3}>
                        <Button variant="ghost" onClick={handleClose} isDisabled={isSubmitting}>
                            Cancel
                        </Button>
                        {generatedImage ? (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setGeneratedImage(null);
                                        setGenerationStatus(null);
                                        setCurrentMapId(null);
                                    }}
                                    isDisabled={isSubmitting}
                                >
                                    Generate Another
                                </Button>
                                <Button
                                    colorScheme="green"
                                    onClick={handleSaveMap}
                                >
                                    Save Map
                                </Button>
                            </>
                        ) : (
                            <Button
                                colorScheme="blue"
                                leftIcon={<FiZap />}
                                onClick={handleGenerate}
                                isLoading={isSubmitting}
                                loadingText="Generating..."
                                isDisabled={!formData.name.trim() || !formData.prompt.trim()}
                            >
                                Generate Map
                            </Button>
                        )}
                    </HStack>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default AIMapGenerator;