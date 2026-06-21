#!/bin/bash

# Script to automatically install all dependencies
# Exits on first error
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=========================================================================${NC}"
echo -e "${GREEN}               Installing application dependencies                       ${NC}"
echo -e "${GREEN}=========================================================================${NC}\n"

#backend modules
if [ -d "backend" ]; then
	echo -e "${GREEN}Installing Backend Dependencies...${NC}"
	cd backend

	# Check if Node.js is available
	if ! command -v node &> /dev/null; then
		echo -e "${RED}Error: Node.js is not installed${NC}"
		exit 1
	fi

	# Install npm dependencies
	npm install
	echo -e "${GREEN}Backend npm dependencies installed${NC}\n"

	# Generate Prisma client
	if [ -f "prisma/schema.prisma" ]; then
		echo -e "${GREEN}Generating Prisma Client...${NC}"
		npx prisma generate
	else
		echo -e "${YELLOW}Prisma schema not found, skipping Prisma setup${NC}\n"
	fi

	cd ..
else
	echo -e "${RED}Error: backend directory not found${NC}"
	exit 1
fi

# Frontend modules
if [ -d "frontend" ]; then
	echo -e "${GREEN}Installing Frontend Dependencies...${NC}"
	cd frontend
	npm install
	echo -e "${GREEN}Frontend npm dependencies installed${NC}\n"
	cd ..
else
	echo -e "${RED}Error: frontend directory not found${NC}"
	exit 1
fi

echo -e "${GREEN}=========================================================================${NC}"
echo -e "${GREEN}             All dependencies installed successfully!                    ${NC}"
echo -e "${GREEN}=========================================================================${NC}\n"
