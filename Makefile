COMPOSE    = docker compose
SSL_DIR    = ssl
CERT       = $(SSL_DIR)/server.crt
KEY        = $(SSL_DIR)/server.key
INSTALL_SH = ./install_deps.sh

GREEN     = \033[0;32m
RED       = \033[0;31m
NC        = \033[0m

all: install start

# install local dependencies
install:
	@if [ -f "install_deps.sh" ]; then \
		$(INSTALL_SH); \
	else \
		echo "$(RED)Error: Setup script $(INSTALL_SH) is missing$(NC)"; \
		exit 1; \
	fi

# generate ssl certificate
ssl_prep:
	@if [ ! -f $(CERT) ] || [ ! -f $(KEY) ]; then \
		echo "$(GREEN)=========================================================================$(NC)"; \
		echo "$(GREEN)   Generating fresh self-signed SSL certificates for Perimeter Gateway   $(NC)"; \
		echo "$(GREEN)=========================================================================$(NC)"; \
		mkdir -p $(SSL_DIR) \
		openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
			-keyout $(KEY) \
			-out $(CERT) \
			-subj "/C=FR/ST=IDF/L=Paris/O=42/OU=Transcendence/CN=localhost"; \
		chmod 644 $(KEY) $(CERT); \
		echo -e "$(GREEN)SSL credentials successfully generated and hardened (chmod 644).$(NC)"; \
	else \
		echo "Valid SSL certificates found inside ./ssl/. Skipping generation."; \
	fi


#launch clusters in detached mode (in the background)
start: ssl_prep
	$(COMPOSE) up -d
	@echo "$(GREEN)=========================================================================$(NC)"; \
	echo "$(GREEN)  Cluster is online! Run 'make logs' to view structural runtime streams  $(NC)"; \
	echo "$(GREEN)=========================================================================$(NC)"; \

#build or rebuild containers
build:
	$(COMPOSE) build

# stop running containers
stop:
	$(COMPOSE) stop

# tear down the networking bridge and containers safely
down:
	$(COMPOSE) down

# stream live terminal standard output streams
logs:
	@echo -e "$(GREEN)Streaming logs... (Press Ctrl+C to quit)$(NC)"
	-$(COMPOSE) logs -f

# safly stop containers and prune system garbage
clean: down
	@echo "$(GREEN)=========================================================================$(NC)"; \
	echo "$(GREEN)    Pruning dangling images, networks, and stopped containers safely     $(NC)"; \
	echo "$(GREEN)=========================================================================$(NC)"; \
	docker system prune -f

.PHONY: all build start stop down logs clean ssl_prep install
