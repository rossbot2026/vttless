// client/src/components/MapSidebar.jsx
import React, { useState } from 'react';
import {
    Drawer,
    DrawerBody,
    DrawerHeader,
    DrawerOverlay,
    DrawerContent,
    DrawerCloseButton,
    Button,
    VStack,
    Grid,
    GridItem,
    useToast,
    FormControl,
    FormLabel,
    Input,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    NumberIncrementStepper,
    NumberDecrementStepper,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    Text,
    useDisclosure,
    Box,
    Alert,
    AlertIcon,
    FormHelperText,
    Divider,
    Spinner,
    Badge
} from '@chakra-ui/react';
import { FiPlus, FiMap, FiZap } from 'react-icons/fi';
import { api } from '../common/axiosPrivate';
import MapEditDrawer from './MapEditDrawer';
import AIMapGenerator from './AIMapGenerator';


const NewMapModal = ({ isOpen, onClose, onSubmit, isSubmitting }) => {
    const [mapData, setMapData] = useState({
        name: '',
        gridSize: 40,
        gridWidth: 20,
        gridHeight: 15
    });
    const [imageFile, setImageFile] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const toast = useToast();

    const handleImageUpload = async (file) => {
        setImageFile(file);
        setAnalyzing(true);
        setAnalysisResult(null);

        try {
            const formData = new FormData();
            formData.append('image', file);
            
            const response = await api.post('/maps/analyze', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const result = response.data;
            setAnalysisResult(result);

            if (result.success && result.suggestions) {
                // Auto-populate form with analysis results
                setMapData(prev => ({
                    ...prev,
                    gridWidth: result.suggestions.gridWidth,
                    gridHeight: result.suggestions.gridHeight,
                    gridSize: result.suggestions.gridSize
                }));

                toast({
                    title: "Grid Analysis Complete",
                    description: `Detected ${result.suggestions.gridWidth}×${result.suggestions.gridHeight} grid (${Math.round(result.confidence * 100)}% confidence)`,
                    status: "success",
                    duration: 4000,
                });
            } else {
                toast({
                    title: "Analysis Complete",
                    description: "Could not detect grid automatically. Using default values.",
                    status: "info",
                    duration: 3000,
                });
            }
        } catch (error) {
            console.error('Analysis failed:', error);
            toast({
                title: "Analysis Failed",
                description: "Could not analyze image. Using default values.",
                status: "warning",
                duration: 3000,
            });
        } finally {
            setAnalyzing(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({ ...mapData, imageFile });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalOverlay />
            <ModalContent>
                <form onSubmit={handleSubmit}>
                    <ModalHeader>Create New Map</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <VStack spacing={4}>
                            <FormControl isRequired>
                                <FormLabel>Map Name</FormLabel>
                                <Input
                                    value={mapData.name}
                                    onChange={(e) => setMapData({
                                        ...mapData,
                                        name: e.target.value
                                    })}
                                    placeholder="Enter map name"
                                />
                            </FormControl>

                            <Divider />

                            <FormControl>
                                <FormLabel>Map Image (Optional)</FormLabel>
                                <Box
                                    border="2px dashed"
                                    borderColor={imageFile ? "green.300" : "gray.300"}
                                    borderRadius="md"
                                    p={6}
                                    textAlign="center"
                                    cursor="pointer"
                                    _hover={{ borderColor: "blue.400" }}
                                    onClick={() => document.getElementById('map-file-input').click()}
                                >
                                    <input
                                        id="map-file-input"
                                        type="file"
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) handleImageUpload(file);
                                        }}
                                    />
                                    
                                    {analyzing ? (
                                        <VStack spacing={2}>
                                            <Spinner color="blue.500" />
                                            <Text>Analyzing grid...</Text>
                                        </VStack>
                                    ) : imageFile ? (
                                        <VStack spacing={2}>
                                            <FiMap size={24} color="green" />
                                            <Text color="green.600" fontWeight="medium">
                                                {imageFile.name}
                                            </Text>
                                            {analysisResult && analysisResult.success && (
                                                <Badge colorScheme="green">
                                                    Grid detected ({Math.round(analysisResult.confidence * 100)}% confidence)
                                                </Badge>
                                            )}
                                        </VStack>
                                    ) : (
                                        <VStack spacing={2}>
                                            <FiPlus size={24} />
                                            <Text>Click to upload map image</Text>
                                            <Text fontSize="sm" color="gray.500">
                                                Grid properties will be auto-detected
                                            </Text>
                                        </VStack>
                                    )}
                                </Box>
                            </FormControl>

                            {analysisResult && analysisResult.success && (
                                <Alert status="success" size="sm">
                                    <AlertIcon />
                                    <Text fontSize="sm">
                                        Auto-detected: {analysisResult.suggestions.gridWidth}×{analysisResult.suggestions.gridHeight} grid
                                        ({analysisResult.suggestions.gridSize}px squares)
                                    </Text>
                                </Alert>
                            )}

                            <Divider />

                            <FormControl isRequired>
                                <FormLabel>Grid Size (pixels)</FormLabel>
                                <NumberInput
                                    value={mapData.gridSize}
                                    onChange={(value) => setMapData({
                                        ...mapData,
                                        gridSize: parseInt(value)
                                    })}
                                    min={20}
                                    max={100}
                                >
                                    <NumberInputField />
                                    <NumberInputStepper>
                                        <NumberIncrementStepper />
                                        <NumberDecrementStepper />
                                    </NumberInputStepper>
                                </NumberInput>
                                {analysisResult && analysisResult.success && (
                                    <FormHelperText>
                                        Auto-detected: {analysisResult.suggestions.gridSize}px squares
                                    </FormHelperText>
                                )}
                            </FormControl>

                            <FormControl isRequired>
                                <FormLabel>Grid Width (squares)</FormLabel>
                                <NumberInput
                                    value={mapData.gridWidth}
                                    onChange={(value) => setMapData({
                                        ...mapData,
                                        gridWidth: parseInt(value)
                                    })}
                                    min={1}
                                    max={100}
                                >
                                    <NumberInputField />
                                    <NumberInputStepper>
                                        <NumberIncrementStepper />
                                        <NumberDecrementStepper />
                                    </NumberInputStepper>
                                </NumberInput>
                                {analysisResult && analysisResult.success && (
                                    <FormHelperText>
                                        Auto-detected: {analysisResult.suggestions.gridWidth} squares wide
                                    </FormHelperText>
                                )}
                            </FormControl>

                            <FormControl isRequired>
                                <FormLabel>Grid Height (squares)</FormLabel>
                                <NumberInput
                                    value={mapData.gridHeight}
                                    onChange={(value) => setMapData({
                                        ...mapData,
                                        gridHeight: parseInt(value)
                                    })}
                                    min={1}
                                    max={100}
                                >
                                    <NumberInputField />
                                    <NumberInputStepper>
                                        <NumberIncrementStepper />
                                        <NumberDecrementStepper />
                                    </NumberInputStepper>
                                </NumberInput>
                                {analysisResult && analysisResult.success && (
                                    <FormHelperText>
                                        Auto-detected: {analysisResult.suggestions.gridHeight} squares tall
                                    </FormHelperText>
                                )}
                            </FormControl>
                        </VStack>
                    </ModalBody>

                    <ModalFooter>
                        <Button variant="ghost" mr={3} onClick={onClose}>
                            Cancel
                        </Button>
                        <Button 
                            colorScheme="blue" 
                            type="submit"
                            isLoading={isSubmitting}
                        >
                            Create Map
                        </Button>
                    </ModalFooter>
                </form>
            </ModalContent>
        </Modal>
    );
};

const MapSidebar = ({ isOpen, onClose, campaign, onMapAdd, isGM }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedMap, setSelectedMap] = useState(null);
    const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);

    const toast = useToast();
    const {
        isOpen: isNewMapModalOpen,
        onOpen: onNewMapModalOpen,
        onClose: onNewMapModalClose
    } = useDisclosure();
    
    const {
        isOpen: isAIMapModalOpen,
        onOpen: onAIMapModalOpen,
        onClose: onAIMapModalClose
    } = useDisclosure();
    
    const handleCreateMap = async (mapData) => {
        setIsSubmitting(true);
        try {
            // Create new map
            const response = await api.post('/maps', {
                name: mapData.name,
                gridWidth: mapData.gridWidth,
                gridHeight: mapData.gridHeight,
                campaign: campaign._id,
                gridSettings: {
                    size: mapData.gridSize,
                    visible: true,
                    color: '#ccc'
                }
            });

            const mapId = response.data._id;

            // If an image was uploaded, set it as background
            if (mapData.imageFile) {
                const { uploadAsset } = await import('../utils/assetUtils');
                try {
                    const assetId = await uploadAsset(mapData.imageFile, 'background');
                    
                    // Update map with background image
                    await api.patch(`/maps/${mapId}`, {
                        backgroundImage: {
                            assetId: assetId,
                            position: { x: 0, y: 0 },
                            scale: 1
                        }
                    });
                } catch (uploadError) {
                    console.error('Failed to upload background image:', uploadError);
                    toast({
                        title: "Map created, but image upload failed",
                        description: "You can add the background image later",
                        status: "warning",
                        duration: 4000,
                    });
                }
            }

            // Update campaign with new map
            await api.post(`/campaigns/${campaign._id}/maps`, {
                mapId: mapId
            });

            onMapAdd(); // Refresh campaign data
            onNewMapModalClose();
            toast({
                title: "Map created successfully",
                description: mapData.imageFile ? "Map created with background image" : "Map created",
                status: "success",
                duration: 3000,
            });
        } catch (error) {
            toast({
                title: "Error creating map",
                description: error.message,
                status: "error",
                duration: 3000,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSetActiveMap = async (mapId) => {
        if (!isGM) return;
        
        try {
            await api.patch(`/campaigns/${campaign._id}`, {
                activeMap: mapId
            });
            onMapAdd();
            toast({
                title: "Active map updated",
                status: "success",
                duration: 2000,
            });
        } catch (error) {
            toast({
                title: "Error updating active map",
                description: error.message,
                status: "error",
                duration: 3000,
            });
        }
    };
    const handleMapClick = (map) => {
        if (isGM) {
            setSelectedMap(map);
            setIsEditDrawerOpen(true);
        } else {
            handleSetActiveMap(map._id);
        }
    };

    return (
        <>
            <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="md">
                <DrawerOverlay />
                <DrawerContent>
                    <DrawerCloseButton />
                    <DrawerHeader>Campaign Maps</DrawerHeader>
                    <DrawerBody>
                        <VStack spacing={4} align="stretch">
                            {isGM && (
                                <>
                                    <Button
                                        leftIcon={<FiPlus />}
                                        colorScheme="blue"
                                        onClick={onNewMapModalOpen}
                                    >
                                        Create New Map
                                    </Button>
                                    <Button
                                        leftIcon={<FiZap />}
                                        colorScheme="purple"
                                        variant="outline"
                                        onClick={onAIMapModalOpen}
                                    >
                                        Generate AI Map
                                    </Button>
                                </>
                            )}
                            
                            <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                                {campaign?.maps?.map((map) => (
                                    <GridItem key={map._id}>
                                        <VStack
                                            p={4}
                                            border="1px"
                                            borderColor="gray.200"
                                            borderRadius="md"
                                            cursor={isGM ? "pointer" : "default"}
                                            onClick={() => isGM && handleMapClick(map)}
                                            bg={campaign.activeMap === map._id ? "blue.50" : "white"}
                                            _hover={{
                                                bg: isGM ? "gray.50" : "white"
                                            }}
                                        >
                                            <Text color="gray.800" fontWeight="bold">{map.name}</Text>
                                            <Text fontSize="sm" color="gray.600">
                                                {map.gridWidth && map.gridHeight 
                                                    ? `${map.gridWidth}×${map.gridHeight} grid`
                                                    : 'No grid dimensions'
                                                }
                                            </Text>
                                        </VStack>
                                    </GridItem>
                                ))}
                            </Grid>
                        </VStack>
                    </DrawerBody>
                </DrawerContent>
            </Drawer>

            <NewMapModal
                isOpen={isNewMapModalOpen}
                onClose={onNewMapModalClose}
                onSubmit={handleCreateMap}
                isSubmitting={isSubmitting}
            />
            <MapEditDrawer
                isOpen={isEditDrawerOpen}
                onClose={() => setIsEditDrawerOpen(false)}
                map={selectedMap}
                onMapUpdate={onMapAdd}
            />
            <AIMapGenerator
                isOpen={isAIMapModalOpen}
                onClose={onAIMapModalClose}
                campaignId={campaign?._id}
                onMapGenerated={onMapAdd}
            />
        </>
    );
};

export default MapSidebar;