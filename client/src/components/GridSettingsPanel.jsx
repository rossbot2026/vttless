import React, { useState } from 'react';
import {
    Box,
    VStack,
    HStack,
    Card,
    CardBody,
    Text,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    NumberIncrementStepper,
    NumberDecrementStepper,
    Switch,
    FormControl,
    FormLabel,
    IconButton
} from '@chakra-ui/react';
import { IoChevronDown, IoChevronUp } from 'react-icons/io5';

/**
 * GridSettingsPanel Component
 * Manages grid configuration for the game map
 * Allows GMs to adjust grid dimensions, square size, visibility, and color
 */
const GridSettingsPanel = ({
    gridSettings,
    onGridSettingsUpdate,
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
                    Grid Settings
                </Text>
                <IconButton
                    icon={isCollapsed ? <IoChevronDown /> : <IoChevronUp />}
                    size="xs"
                    variant="ghost"
                    color="gray.400"
                    aria-label={isCollapsed ? "Expand grid settings" : "Collapse grid settings"}
                    _hover={{ color: 'orange.400' }}
                />
            </HStack>
            {!isCollapsed && (
                <VStack spacing={4} align="stretch">
                    <Card bg="gray.700" borderColor="gray.600">
                        <CardBody>
                            <VStack spacing={4} align="stretch">
                                {/* Grid Dimensions */}
                                <Box>
                                    <Text fontSize="sm" fontWeight="semibold" mb={3} color="gray.300">
                                        Map Dimensions (Grid Squares)
                                    </Text>
                                    <HStack spacing={4}>
                                        <FormControl>
                                            <FormLabel fontSize="xs" color="gray.400">Width</FormLabel>
                                            <NumberInput
                                                value={gridSettings.gridWidth}
                                                onChange={(value) => {
                                                    const newSettings = { ...gridSettings, gridWidth: parseInt(value) || 1 };
                                                    onGridSettingsUpdate(newSettings);
                                                }}
                                                min={1}
                                                max={100}
                                                size="sm"
                                                bg="gray.600"
                                            >
                                                <NumberInputField 
                                                    color="white"
                                                    border="1px solid"
                                                    borderColor="gray.500"
                                                    _focus={{ borderColor: 'orange.400', boxShadow: 'none' }}
                                                />
                                                <NumberInputStepper>
                                                    <NumberIncrementStepper color="gray.400" />
                                                    <NumberDecrementStepper color="gray.400" />
                                                </NumberInputStepper>
                                            </NumberInput>
                                        </FormControl>
                                        <FormControl>
                                            <FormLabel fontSize="xs" color="gray.400">Height</FormLabel>
                                            <NumberInput
                                                value={gridSettings.gridHeight}
                                                onChange={(value) => {
                                                    const newSettings = { ...gridSettings, gridHeight: parseInt(value) || 1 };
                                                    onGridSettingsUpdate(newSettings);
                                                }}
                                                min={1}
                                                max={100}
                                                size="sm"
                                                bg="gray.600"
                                            >
                                                <NumberInputField 
                                                    color="white"
                                                    border="1px solid"
                                                    borderColor="gray.500"
                                                    _focus={{ borderColor: 'orange.400', boxShadow: 'none' }}
                                                />
                                                <NumberInputStepper>
                                                    <NumberIncrementStepper color="gray.400" />
                                                    <NumberDecrementStepper color="gray.400" />
                                                </NumberInputStepper>
                                            </NumberInput>
                                        </FormControl>
                                    </HStack>
                                </Box>

                                {/* Grid Square Size */}
                                <Box>
                                    <Text fontSize="sm" fontWeight="semibold" mb={3} color="gray.300">
                                        Grid Square Size (Pixels)
                                    </Text>
                                    <NumberInput
                                        value={gridSettings.gridSize}
                                        onChange={(value) => {
                                            const newSettings = { ...gridSettings, gridSize: parseInt(value) || 10 };
                                            onGridSettingsUpdate(newSettings);
                                        }}
                                        min={10}
                                        max={200}
                                        size="sm"
                                        bg="gray.600"
                                    >
                                        <NumberInputField 
                                            color="white"
                                            border="1px solid"
                                            borderColor="gray.500"
                                            _focus={{ borderColor: 'orange.400', boxShadow: 'none' }}
                                        />
                                        <NumberInputStepper>
                                            <NumberIncrementStepper color="gray.400" />
                                            <NumberDecrementStepper color="gray.400" />
                                        </NumberInputStepper>
                                    </NumberInput>
                                </Box>

                                {/* Grid Visibility */}
                                <Box>
                                    <HStack spacing={3}>
                                        <Text fontSize="sm" fontWeight="semibold" color="gray.300">
                                            Show Grid Lines
                                        </Text>
                                        <Switch
                                            isChecked={gridSettings.visible}
                                            onChange={(e) => {
                                                const newSettings = { ...gridSettings, visible: e.target.checked };
                                                onGridSettingsUpdate(newSettings);
                                            }}
                                            colorScheme="orange"
                                            size="sm"
                                        />
                                    </HStack>
                                </Box>

                                {/* Current Map Size Info */}
                                <Box bg="gray.600" p={3} borderRadius="md">
                                    <Text fontSize="xs" color="gray.400" mb={1}>
                                        Current Map Size:
                                    </Text>
                                    <Text fontSize="sm" color="white">
                                        {gridSettings.gridWidth * gridSettings.gridSize} × {gridSettings.gridHeight * gridSettings.gridSize} pixels
                                    </Text>
                                    <Text fontSize="xs" color="gray.400">
                                        ({gridSettings.gridWidth} × {gridSettings.gridHeight} grid squares @ {gridSettings.gridSize}px each)
                                    </Text>
                                </Box>
                            </VStack>
                        </CardBody>
                    </Card>
                </VStack>
            )}
        </Box>
    );
};

export default GridSettingsPanel;
