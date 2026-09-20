    org 0e000h
    jp probe1
    jp probe2
    jp probe3
    jp probe4
    jp probe5
    jp probe6
    jp probe7
    jp probe8
    jp probe9
probe1:
    ld a,'1'
    ld (probe_number),a
    di
    ld sp,0ff00h
    call probe_video
    jp result
probe2:
    ld a,'2'
    ld (probe_number),a
    di
    ld sp,0ff00h
    ld a,0
    out (0f3h),a
    call probe_video
    jp result
probe3:
    ld a,'3'
    ld (probe_number),a
    di
    ld sp,0ff00h
    ld a,7
    out (0f3h),a
    call probe_video
    jp result
probe4:
    ld a,'4'
    ld (probe_number),a
    di
    ld sp,0ff00h
    ld a,32
    out (0f3h),a
    call probe_video
    jp result
probe5:
    ld a,'5'
    ld (probe_number),a
    di
    ld sp,0ff00h
    ld a,64
    out (0f3h),a
    call probe_video
    jp result
probe6:
    ld a,'6'
    ld (probe_number),a
    di
    ld sp,0ff00h
    ld a,128
    out (0f3h),a
    call probe_video
    jp result
probe7:
    ld a,'7'
    ld (probe_number),a
    di
    ld sp,0ff00h
    ld a,224
    out (0f3h),a
    call probe_video
    jp result
probe8:
    ld a,'8'
    ld (probe_number),a
    di
    ld sp,0ff00h
    ld a,231
    out (0f3h),a
    call probe_video
    jp result
probe9:
    ld a,'9'
    ld (probe_number),a
    di
    ld sp,0ff00h
    ld a,230
    out (0f3h),a
    call probe_video
    jp result
probe_video:
    xor a
    out (0c1h),a
    ld a,0f5h
    out (0b0h),a
    xor a
    out (0c0h),a
    ; Write-only clear: probes 1/2 still read ROM at 0000h, so no LDIR.
    ld hl,0
    ld bc,04000h
clear_loop:
    ld (hl),0
    inc hl
    dec bc
    ld a,b
    or c
    jr nz,clear_loop
    ld a,3
    out (093h),a
    ret
result:
    ld hl,probe_title
    ld de,023c0h
    call loader_text
    ld a,(probe_number)
    call loader_char
    ld hl,probe_hint
    ld de,02500h
    call loader_text
blink:
    ld a,(blink_value)
    cpl
    ld (blink_value),a
    ld hl,02c80h
    ld de,40
    ld b,16
blink_row:
    ld (hl),a
    add hl,de
    djnz blink_row
    ld d,3
delay_outer:
    ld bc,0
delay:
    dec bc
    ld a,b
    or c
    jr nz,delay
    dec d
    jr nz,delay_outer
    jr blink
probe_number: db 0
blink_value: db 0
probe_title: db 'SR F3 V3 - TEST ',0
probe_hint: db 'BLINK = CPU RUNNING',0
loader_video:
    xor a
    out (0c1h),a
    ld a,0f5h               ; set VRAM AFTER mode, as in the working screen test
    out (0b0h),a
    xor a
    out (0c0h),a
    ld hl,0
    ld de,1
    ld bc,03fffh
    ld (hl),a
    ldir
    ld a,3
    out (093h),a
    ld hl,loader_title
    ld de,02000h
    call loader_text
    ld hl,loader_rx_text
    ld de,02b40h
    call loader_text
    ld hl,loader_header_text
loader_stage:
    ld de,02280h
    jp loader_text
loader_progress:
    push af
    push bc
    push de
    push hl
    ld de,02a00h
    ld a,h
    call loader_hex
    ld a,l
    call loader_hex
    pop hl
    pop de
    pop bc
    pop af
    ret
loader_hex:
    push af
    rrca
    rrca
    rrca
    rrca
    call loader_nibble
    pop af
loader_nibble:
    and 15
    add a,'0'
    cp '9'+1
    jr c,loader_char
    add a,7
loader_char:
    push hl
    push bc
    push de
    sub 32
    ld l,a
    ld h,0
    add hl,hl
    add hl,hl
    add hl,hl
    ld bc,loader_font
    add hl,bc
    ld b,8
loader_glyph:
    ld a,(hl)
    ld (de),a
    inc hl
    ld a,e
    add a,40
    ld e,a
    jr nc,loader_glyph_next
    inc d
loader_glyph_next:
    djnz loader_glyph
    pop de
    pop bc
    pop hl
    inc de
    ret
loader_text:
    ld a,(hl)
    inc hl
    or a
    ret z
    call loader_char
    jr loader_text
loader_title: db 'P60GUE LOADER V2',0
loader_rx_text: db 'RX: -------- EXPECT 50365231',0
loader_header_text: db 'WAIT HEADER',0
loader_code_text: db 'LOAD CODE  ',0
loader_font1_text: db 'LOAD FONT 1',0
loader_font2_text: db 'LOAD FONT 2',0
loader_error_text: db 'ERROR ',0
loader_legend: db '1:HEADER 2:SUM 3:TIME 4:IO 5:OVR 6:STOP',0
loader_legend2: db '7:SEND TIMEOUT 8:READ TIMEOUT',0
loader_font: incbin "../build/font.bin"

    assert $ < 0f000h
