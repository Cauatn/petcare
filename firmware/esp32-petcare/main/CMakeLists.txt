idf_component_register(
    SRCS
        "main.c"
        "config_store.c"
        "wifi_manager.c"
        "api_client.c"
        "sonar_sensor.c"
        "capacitive_sensor.c"
        "mic_sensor.c"
        "json_util.c"
        "captive_dns.c"
    INCLUDE_DIRS "."
    EMBED_TXTFILES "portal.html"
)
